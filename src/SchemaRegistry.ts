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
} from './errors'
import { ConfluentSchema, ConfluentSubject, Serdes, schemaTypeFromString } from './@types'
import AvroSerdes from './AvroSerdes'

interface RegisteredSchema {
  id: number
}

interface Opts {
  compatibility?: COMPATIBILITY
  separator?: string
  subject?: string
}

const DEFAULT_OPTS = {
  compatibility: COMPATIBILITY.BACKWARD,
  separator: DEFAULT_SEPERATOR,
}

export default class SchemaRegistry {
  private api: SchemaRegistryAPIClient
  private cacheMissRequests: { [key: number]: Promise<Response> } = {}
  private serdes: Serdes

  public cache: Cache

  constructor(
    { auth, clientId, host, retry }: SchemaRegistryAPIClientArgs,
    serdes: Serdes = new AvroSerdes(),
  ) {
    this.api = API({ auth, clientId, host, retry })
    this.cache = new Cache()
    this.serdes = serdes
  }

  public async register(
    schema: ConfluentSchema,
    subject: ConfluentSubject,
    userOpts?: Opts,
  ): Promise<RegisteredSchema> {
    const { compatibility } = { ...DEFAULT_OPTS, ...userOpts }

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
        schemaType: schema.type,
        schema: schema.schemaString,
      },
    })

    const registeredSchema: RegisteredSchema = response.data()
    this.cache.setLatestRegistryId(subject.name, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, schema)

    return registeredSchema
  }

  public async getSchema(registryId: number): Promise<ConfluentSchema> {
    const schema = this.cache.getSchema(registryId)

    if (schema) {
      return schema
    }

    const response = await this.getSchemaOriginRequest(registryId)
    const foundSchema: { schema: string; schemaType: string } = response.data()
    const rawSchema = foundSchema.schema
    const confluentSchema: ConfluentSchema = { type: schemaTypeFromString(foundSchema.schemaType), schemaString: rawSchema }
    return this.cache.setSchema(registryId, confluentSchema)
  }

  public async encode(registryId: number, payload: any): Promise<Buffer> {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const schema = await this.getSchema(registryId)

    const serializedPayload = this.serdes.serialize(schema, payload)

    return encode(registryId, serializedPayload)
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
    return this.serdes.deserialize(schema, payload)
  }

  public async getRegistryId(subject: string, version: number | string): Promise<number> {
    const response = await this.api.Subject.version({ subject, version })
    const { id }: { id: number } = response.data()

    return id
  }

  public async getRegistryIdBySchema(subject: string, schema: ConfluentSchema): Promise<number> {
    try {
      const response = await this.api.Subject.registered({
        subject,
        body: { schema: schema.schemaString },
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
