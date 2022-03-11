import { Type } from 'avsc'
import { Response } from 'mappersmith'

import { encode, MAGIC_BYTE } from './wireEncoder'
import decode from './wireDecoder'
import { COMPATIBILITY, DEFAULT_SEPERATOR } from './constants'
import API, { SchemaRegistryAPIClientArgs, SchemaRegistryAPIClient } from './api'
import Cache from './cache'
import {
  ConfluentSchemaRegistryError,
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
  ConfluentSchemaRegistryValidationError,
} from './errors'
import {
  Schema,
  RawAvroSchema,
  AvroSchema,
  SchemaType,
  ConfluentSchema,
  ConfluentSubject,
  SchemaRegistryAPIClientOptions,
  AvroConfluentSchema,
  SchemaResponse,
  ProtoConfluentSchema,
  ProtocolOptions,
  SchemaHelper,
  ReferenceType,
} from './@types'
import {
  helperTypeFromSchemaType,
  schemaTypeFromString,
  schemaFromConfluentSchema,
} from './schemaTypeResolver'

export interface RegisteredSchema {
  id: number
}

interface Opts {
  compatibility?: COMPATIBILITY
  separator?: string
  subject: string
}

interface AvroDecodeOptions {
  readerSchema?: RawAvroSchema | AvroSchema | Schema
}
interface DecodeOptions {
  [SchemaType.AVRO]?: AvroDecodeOptions
}

const DEFAULT_OPTS = {
  compatibility: COMPATIBILITY.BACKWARD,
  separator: DEFAULT_SEPERATOR,
}
export default class SchemaRegistry {
  private api: SchemaRegistryAPIClient
  private cacheMissRequests: { [key: number]: Promise<Response> } = {}
  private options: SchemaRegistryAPIClientOptions | undefined

  public cache: Cache

  constructor(
    { auth, clientId, host, retry, agent }: SchemaRegistryAPIClientArgs,
    options?: SchemaRegistryAPIClientOptions,
  ) {
    this.api = API({ auth, clientId, host, retry, agent })
    this.cache = new Cache()
    this.options = options
  }

  private isConfluentSchema(
    schema: RawAvroSchema | AvroSchema | ConfluentSchema,
  ): schema is ConfluentSchema {
    return (schema as ConfluentSchema).schema != null
  }

  private getConfluentSchema(
    schema: RawAvroSchema | AvroSchema | ConfluentSchema,
  ): ConfluentSchema {
    let confluentSchema: ConfluentSchema
    // convert data from old api (for backwards compatibility)
    if (!this.isConfluentSchema(schema)) {
      // schema is instanceof RawAvroSchema or AvroSchema
      confluentSchema = {
        type: SchemaType.AVRO,
        schema: JSON.stringify(schema),
      }
    } else {
      confluentSchema = schema as ConfluentSchema
    }
    return confluentSchema
  }

  public async register(
    schema: Exclude<ConfluentSchema, AvroConfluentSchema>,
    userOpts: Opts,
  ): Promise<RegisteredSchema>
  public async register(
    schema: RawAvroSchema | AvroConfluentSchema,
    userOpts?: Omit<Opts, 'subject'> & { subject?: string },
  ): Promise<RegisteredSchema>
  public async register(
    schema: RawAvroSchema | ConfluentSchema,
    userOpts: Opts,
  ): Promise<RegisteredSchema>
  public async register(
    schema: RawAvroSchema | ConfluentSchema,
    userOpts?: Opts,
  ): Promise<RegisteredSchema> {
    const { compatibility, separator } = { ...DEFAULT_OPTS, ...userOpts }

    const confluentSchema: ConfluentSchema = this.getConfluentSchema(schema)

    const helper = helperTypeFromSchemaType(confluentSchema.type)

    this.options = await this.updateOptionsWithSchemaReferences(this.options, confluentSchema)
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, this.options)
    helper.validate(schemaInstance)

    let subject: ConfluentSubject
    if (userOpts?.subject) {
      subject = {
        name: userOpts.subject,
      }
    } else {
      subject = helper.getSubject(confluentSchema, schemaInstance, separator)
    }

    try {
      const response = await this.api.Subject.config({ subject: subject.name })
      const { compatibilityLevel }: { compatibilityLevel: COMPATIBILITY } = response.data()

      if (compatibilityLevel.toUpperCase() !== compatibility) {
        throw new ConfluentSchemaRegistryCompatibilityError(
          `Compatibility does not match the configuration (${compatibility} != ${compatibilityLevel.toUpperCase()})`,
        )
      }
    } catch (error) {
      if (error.status !== 404) {
        throw error
      }

      if (compatibility) {
        await this.api.Subject.updateConfig({ subject: subject.name, body: { compatibility } })
      }
    }

    const references =
      confluentSchema.type === SchemaType.PROTOBUF || confluentSchema.type === SchemaType.JSON
        ? (confluentSchema as ProtoConfluentSchema).references
        : undefined

    const response = await this.api.Subject.register({
      subject: subject.name,
      body: {
        schemaType: confluentSchema.type === SchemaType.AVRO ? undefined : confluentSchema.type,
        schema: confluentSchema.schema,
        references,
      },
    })

    const registeredSchema: RegisteredSchema = response.data()
    this.cache.setLatestRegistryId(subject.name, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, confluentSchema.type, schemaInstance)

    return registeredSchema
  }

  private async updateOptionsWithSchemaReferences(
    options: SchemaRegistryAPIClientOptions | undefined,
    schema: ConfluentSchema,
  ) {
    const helper = helperTypeFromSchemaType(schema.type)
    const referredSchemas = await this.getReferredSchemas(schema, helper)
    return helper.updateOptionsFromSchemaReferences(options as ProtocolOptions, referredSchemas)
  }

  private async getReferredSchemas(
    schema: ConfluentSchema,
    helper: SchemaHelper,
  ): Promise<(string | RawAvroSchema)[]> {
    const referencesSet = new Set<string>()
    return this.getReferredSchemasRecursive(schema, helper, referencesSet)
  }

  private async getReferredSchemasRecursive(
    schema: ConfluentSchema,
    helper: SchemaHelper,
    referencesSet: Set<string>,
  ): Promise<(string | RawAvroSchema)[]> {
    const references = helper.getReferences(schema) || []
    // execute in parallel
    const schemaPromise = references.map(reference =>
      this.getReferredSchemasFromReference(reference, helper, referencesSet),
    )
    return (await Promise.all(schemaPromise)).flat()
  }

  async getReferredSchemasFromReference(
    reference: ReferenceType,
    helper: SchemaHelper,
    referencesSet: Set<string>,
  ): Promise<(string | RawAvroSchema)[]> {
    const { name, subject, version } = reference
    const key = `${name}-${subject}-${version}`

    // avoid duplicates
    if (referencesSet.has(key)) {
      return []
    }
    referencesSet.add(key)

    const versionResponse = await this.api.Subject.version(reference)
    const foundSchema = versionResponse.data() as SchemaResponse

    const schema = helper.toConfluentSchema(foundSchema)
    const referredSchemas = await this.getReferredSchemasRecursive(schema, helper, referencesSet)

    referredSchemas.push(schema.schema)
    return referredSchemas
  }

  private async _getSchema(
    registryId: number,
  ): Promise<{ type: SchemaType; schema: Schema | AvroSchema }> {
    const cacheEntry = this.cache.getSchema(registryId)

    if (cacheEntry) {
      return cacheEntry
    }

    const response = await this.getSchemaOriginRequest(registryId)
    const foundSchema = response.data() as SchemaResponse

    const schemaType = schemaTypeFromString(foundSchema.schemaType)

    const helper = helperTypeFromSchemaType(schemaType)
    const confluentSchema = helper.toConfluentSchema(foundSchema)

    this.options = await this.updateOptionsWithSchemaReferences(this.options, confluentSchema)
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, this.options)
    return this.cache.setSchema(registryId, schemaType, schemaInstance)
  }

  public async getSchema(registryId: number): Promise<Schema | AvroSchema> {
    return await (await this._getSchema(registryId)).schema
  }

  public async encode(registryId: number, payload: any): Promise<Buffer> {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const { schema } = await this._getSchema(registryId)
    try {
      const serializedPayload = schema.toBuffer(payload)
      return encode(registryId, serializedPayload)
    } catch (error) {
      if (error instanceof ConfluentSchemaRegistryValidationError) throw error

      const paths = this.collectInvalidPaths(schema, payload)
      throw new ConfluentSchemaRegistryValidationError(error, paths)
    }
  }

  private collectInvalidPaths(schema: Schema, jsonPayload: object) {
    const paths: string[][] = []
    schema.isValid(jsonPayload, {
      errorHook: path => paths.push(path),
    })

    return paths
  }

  public async decode(buffer: Buffer, options?: DecodeOptions): Promise<any> {
    if (!Buffer.isBuffer(buffer)) {
      throw new ConfluentSchemaRegistryArgumentError('Invalid buffer')
    }

    const { magicByte, registryId, payload } = decode(buffer)
    if (Buffer.compare(MAGIC_BYTE, magicByte) !== 0) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Message encoded with magic byte ${JSON.stringify(magicByte)}, expected ${JSON.stringify(
          MAGIC_BYTE,
        )}`,
      )
    }

    const { type, schema: writerSchema } = await this._getSchema(registryId)

    let rawReaderSchema
    switch (type) {
      case SchemaType.AVRO:
        rawReaderSchema = options?.[SchemaType.AVRO]?.readerSchema as RawAvroSchema | AvroSchema
    }
    if (rawReaderSchema) {
      const readerSchema = schemaFromConfluentSchema(
        { type: SchemaType.AVRO, schema: rawReaderSchema },
        this.options,
      ) as AvroSchema
      if (readerSchema.equals(writerSchema as Type)) {
        /* Even when schemas are considered equal by `avsc`,
         * they still aren't interchangeable:
         * provided `readerSchema` may have different `opts` (e.g. logicalTypes / unionWrap flags)
         * see https://github.com/mtth/avsc/issues/362 */
        return readerSchema.fromBuffer(payload)
      } else {
        // decode using a resolver from writer type into reader type
        return readerSchema.fromBuffer(payload, readerSchema.createResolver(writerSchema as Type))
      }
    }

    return writerSchema.fromBuffer(payload)
  }

  public async getRegistryId(subject: string, version: number | string): Promise<number> {
    const response = await this.api.Subject.version({ subject, version })
    const { id }: { id: number } = response.data()

    return id
  }

  public async getRegistryIdBySchema(
    subject: string,
    schema: AvroSchema | RawAvroSchema | ConfluentSchema,
  ): Promise<number> {
    try {
      const confluentSchema: ConfluentSchema = this.getConfluentSchema(schema)
      const response = await this.api.Subject.registered({
        subject,
        body: {
          schemaType: confluentSchema.type === SchemaType.AVRO ? undefined : confluentSchema.type,
          schema: confluentSchema.schema,
        },
      })
      const { id }: { id: number } = response.data()

      return id
    } catch (error) {
      if (error.status && error.status === 404) {
        throw new ConfluentSchemaRegistryError(error)
      }

      throw error
    }
  }

  public async getLatestSchemaId(subject: string): Promise<number> {
    const response = await this.api.Subject.latestVersion({ subject })
    const { id }: { id: number } = response.data()

    return id
  }

  private getSchemaOriginRequest(registryId: number) {
    // ensure that cache-misses result in a single origin request
    if (this.cacheMissRequests[registryId]) {
      return this.cacheMissRequests[registryId]
    } else {
      const request = this.api.Schema.find({ id: registryId }).finally(() => {
        delete this.cacheMissRequests[registryId]
      })

      this.cacheMissRequests[registryId] = request

      return request
    }
  }
}
