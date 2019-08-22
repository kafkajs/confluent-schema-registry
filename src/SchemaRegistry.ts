import { encode, MAGIC_BYTE } from './encoder'
import decode from './decoder'
import { COMPATIBILITY, DEFAULT_SEPERATOR } from './constants'
import API, { SchemaRegistryAPIClientArgs, SchemaRegistryAPIClient } from './api'
import Cache from './cache'
import {
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
} from './errors'
import { Schema } from './@types'

interface RegisteredSchema {
  id: number
}

// Based on https://github.com/mtth/avsc/issues/140
const collectInvalidPaths = (schema: Schema, jsonPayload: object) => {
  const paths: any = []
  schema.isValid(jsonPayload, {
    errorHook: path => paths.push(path),
  })

  return paths
}

interface Opts {
  compatibility: COMPATIBILITY
  separator: string
}

const DEFAULT_OPTS = {
  compatibility: COMPATIBILITY.BACKWARD,
  separator: DEFAULT_SEPERATOR,
}

export default class SchemaRegistry {
  private api: SchemaRegistryAPIClient
  public cache: Cache

  constructor({ clientId, host, retry }: SchemaRegistryAPIClientArgs) {
    this.api = API({ clientId, host, retry })
    this.cache = new Cache()
  }

  public async register(schema: Schema, userOpts?: Opts): Promise<RegisteredSchema> {
    const { compatibility, separator } = { ...DEFAULT_OPTS, ...userOpts }

    if (!schema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${schema.name}`)
    }

    if (!schema.namespace) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${schema.namespace}`)
    }

    const subject = [schema.namespace, schema.name].join(separator)

    try {
      const response = await this.api.Subject.config({ subject })
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
        await this.api.Subject.updateConfig({ subject, body: { compatibility } })
      }
    }

    const response = await this.api.Subject.register({
      subject,
      body: { schema: JSON.stringify(schema) },
    })

    const registeredSchema: RegisteredSchema = response.data()
    this.cache.setLatestRegistryId(subject, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, schema)

    return registeredSchema
  }

  public async getSchema(registryId: number): Promise<Schema> {
    const schema = this.cache.getSchema(registryId)
    if (schema) {
      return schema
    }

    const response = await this.api.Schema.find({ id: registryId })
    const foundSchema: { schema: string } = response.data()
    const rawSchema: Schema = JSON.parse(foundSchema.schema)

    return this.cache.setSchema(registryId, rawSchema)
  }

  public async encode(registryId: number, jsonPayload: any): Promise<Buffer> {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const schema = await this.getSchema(registryId)

    let avroPayload
    try {
      avroPayload = schema.toBuffer(jsonPayload)
    } catch (error) {
      error.paths = collectInvalidPaths(schema, jsonPayload)
      throw error
    }

    return encode(registryId, avroPayload)
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

  public async getRegistryId(subject: string, version: number): Promise<number> {
    const response = await this.api.Subject.version({ subject, version })
    const { id }: { id: number } = response.data()

    return id
  }
}
