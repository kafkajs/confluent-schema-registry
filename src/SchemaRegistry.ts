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
  ProtocolOptions,
  LegacyOptions
} from './@types'
import {
  helperTypeFromSchemaType,
  schemaTypeFromString,
  schemaFromConfluentSchema,
} from './schemaTypeResolver'
import { Type } from 'avsc/types'

interface RegisteredSchema {
  id: number
}

interface SchemaVersion {
  subject: string
  version: number
}

interface Opts {
  compatibility?: COMPATIBILITY
  separator?: string
  subject: string,
  referenceSchemaIds?: number[]
}

interface Reference {
  name: string
  subject: string
  version: number
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
    const { compatibility, separator, referenceSchemaIds } = { ...DEFAULT_OPTS, ...userOpts }
    let opts = this.options;

    if (referenceSchemaIds) {
      const referenceSchemas = Object.assign({}, ...await Promise.all(referenceSchemaIds.map(async (id) => {
        const referenceSchema = await this.getSchema(id) as AvroSchema
        return { [referenceSchema.name]: referenceSchema }
      })))

      opts = this.populateRegistryWithReferenceSchemas(referenceSchemas)
    }

    const confluentSchema: ConfluentSchema = this.getConfluentSchema(schema)

    const helper = helperTypeFromSchemaType(confluentSchema.type)
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, opts)
    // const schemaInstance = schemaFromConfluentSchema(confluentSchema, this.options, referenceSchemas)
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

    let references;
    if (referenceSchemaIds) {
      references = await Promise.all(referenceSchemaIds.map(async (id) => {
        const refResponseData: SchemaVersion[] = (await this.api.Schema.versions({ id })).data()
        const name = refResponseData[0].subject.split(separator).slice(-1)[0];
        return {
          name,
          subject: refResponseData[0].subject,
          version: refResponseData[0].version
        }
      }))
    }


    const response = await this.api.Subject.register({
      subject: subject.name,
      body: {
        schemaType: confluentSchema.type,
        schema: confluentSchema.schema,
        references
      },
    })

    const registeredSchema: RegisteredSchema = response.data()
    this.cache.setLatestRegistryId(subject.name, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, schemaInstance)

    return registeredSchema
  }

  public async getSchema(registryId: number): Promise<Schema | AvroSchema> {
    const schema = this.cache.getSchema(registryId)
    let opts = this.options

    if (schema) {
      return schema
    }

    const response = await this.getSchemaOriginRequest(registryId)
    const foundSchema: { schema: string; schemaType: string; references?: Reference[]; } = response.data()

    if (foundSchema.references) {
      const referenceSchemas = Object.assign({}, ...await Promise.all(foundSchema.references.map(async (reference) => {
        const referenceSchemaId = await this.getRegistryId(reference.subject, reference.version)
        // @ts-ignore TODO: Fix typings for Schema...
        const referenceType: Type = await this.getSchema(referenceSchemaId)
        return { [reference.subject]: referenceType }
      })));

      opts = this.populateRegistryWithReferenceSchemas(referenceSchemas);
    }

    const rawSchema = foundSchema.schema
    const schemaType = schemaTypeFromString(foundSchema.schemaType)

    if (schemaType === SchemaType.UNKNOWN) {
      throw new ConfluentSchemaRegistryError(`Unknown schema type ${foundSchema.schemaType}`)
    }

    const confluentSchema: ConfluentSchema = {
      type: schemaType,
      schema: rawSchema,
    }
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, opts)
    return this.cache.setSchema(registryId, schemaInstance)
  }

  private populateRegistryWithReferenceSchemas(referenceSchemas: { [x: string]: Type }) {
      const schemaOptions = (this.options as LegacyOptions)?.forSchemaOptions || (this.options as ProtocolOptions)?.[SchemaType.AVRO]

      return {
        [SchemaType.AVRO]: {
          ...schemaOptions,
          registry: {
            ...schemaOptions?.registry,
            ...referenceSchemas
          }
        }
      }
  }

  public async encode(registryId: number, payload: any): Promise<Buffer> {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const schema = await this.getSchema(registryId)
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

  public async decode(buffer: Buffer): Promise<any> {
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

    const schema = await this.getSchema(registryId)
    return schema.fromBuffer(payload)
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
          schemaType: confluentSchema.type,
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
