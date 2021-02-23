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
  ConfluentSchemaRegistrySerdesError,
} from './errors'
import {
  Schema,
  RawAvroSchema,
  SchemaType,
  ConfluentSchema,
  ConfluentSubject,
  SchemaOptions,
} from './@types'
import {
  helperTypeFromSchemaType,
  schemaTypeFromString,
  schemaFromConfluentSchema,
} from './schemaTypeResolver'

interface RegisteredSchema {
  id: number
}

interface Opts {
  compatibility?: COMPATIBILITY
  separator?: string
  subject?: string
  schemaOptions?: SchemaOptions
}

const DEFAULT_OPTS = {
  compatibility: COMPATIBILITY.BACKWARD,
  separator: DEFAULT_SEPERATOR,
}

export default class SchemaRegistry {
  private api: SchemaRegistryAPIClient
  private cacheMissRequests: { [key: number]: Promise<Response> } = {}

  public cache: Cache

  constructor({ auth, clientId, host, retry }: SchemaRegistryAPIClientArgs) {
    this.api = API({ auth, clientId, host, retry })
    this.cache = new Cache()
  }

  private getConfluentSchema(schema: RawAvroSchema | ConfluentSchema): ConfluentSchema {
    let confluentSchema: ConfluentSchema
    // convert data from old api (for backwards compatibility)
    if (!(schema as ConfluentSchema).schemaString) {
      confluentSchema = {
        type: SchemaType.AVRO,
        schemaString: JSON.stringify(schema),
      }
    } else {
      confluentSchema = schema as ConfluentSchema
    }
    return confluentSchema
  }

  public async register(
    schema: RawAvroSchema | ConfluentSchema,
    userOpts?: Opts,
  ): Promise<RegisteredSchema> {
    const { compatibility, separator, schemaOptions } = { ...DEFAULT_OPTS, ...userOpts }

    const confluentSchema: ConfluentSchema = this.getConfluentSchema(schema)

    const helper = helperTypeFromSchemaType(confluentSchema.type)
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, schemaOptions)
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

    const response = await this.api.Subject.register({
      subject: subject.name,
      body: {
        schemaType: confluentSchema.type,
        schema: confluentSchema.schemaString,
      },
    })

    const registeredSchema: RegisteredSchema = response.data()
    this.cache.setLatestRegistryId(subject.name, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, schemaInstance)

    return registeredSchema
  }

  public async getSchema(registryId: number, opts?: SchemaOptions): Promise<Schema> {
    const schema = this.cache.getSchema(registryId)

    if (schema) {
      return schema
    }

    const response = await this.getSchemaOriginRequest(registryId)
    const foundSchema: { schema: string; schemaType: string } = response.data()
    const rawSchema = foundSchema.schema
    const confluentSchema: ConfluentSchema = {
      type: schemaTypeFromString(foundSchema.schemaType),
      schemaString: rawSchema,
    }
    const schemaInstance = schemaFromConfluentSchema(confluentSchema, opts)
    return this.cache.setSchema(registryId, schemaInstance)
  }

  public async encode(registryId: number, payload: any, opts?: SchemaOptions): Promise<Buffer> {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const schema = await this.getSchema(registryId, opts)

    let serializedPayload
    try {
      serializedPayload = schema.toBuffer(payload)
    } catch (error) {
      throw new ConfluentSchemaRegistrySerdesError(error)
    }

    return encode(registryId, serializedPayload)
  }

  public async decode(buffer: Buffer, opts?: SchemaOptions): Promise<any> {
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

    const schema = await this.getSchema(registryId, opts)
    try {
      return schema.fromBuffer(payload)
    } catch (error) {
      throw new ConfluentSchemaRegistrySerdesError(error)
    }
  }

  public async getRegistryId(subject: string, version: number | string): Promise<number> {
    const response = await this.api.Subject.version({ subject, version })
    const { id }: { id: number } = response.data()

    return id
  }

  public async getRegistryIdBySchema(
    subject: string,
    schema: RawAvroSchema | ConfluentSchema,
  ): Promise<number> {
    try {
      const confluentSchema: ConfluentSchema = this.getConfluentSchema(schema)
      const response = await this.api.Subject.registered({
        subject,
        body: {
          schemaType: confluentSchema.type,
          schema: confluentSchema.schemaString,
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
