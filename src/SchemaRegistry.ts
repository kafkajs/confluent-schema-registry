import { encode, MAGIC_BYTE } from './encoder'
import decode from './decoder'
import { COMPATIBILITY, DEFAULT_SEPERATOR } from './constants'
import API, { APIArgs, APIClient } from './api'
import Cache from './cache'
import {
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
} from './errors'
import { Schema } from 'confluent-schema-registry'

interface RegisteredSchema {
  id: number
}

const { BACKWARD } = COMPATIBILITY

// Based on https://github.com/mtth/avsc/issues/140
const collectInvalidPaths = (schema: Schema, jsonPayload: object) => {
  const paths: any = []
  schema.isValid(jsonPayload, {
    errorHook: path => paths.push(path),
  })

  return paths
}

export default class SchemaRegistry {
  private api: APIClient
  public cache: Cache

  constructor({ clientId, host, retry }: APIArgs) {
    this.api = API({ clientId, host, retry })
    this.cache = new Cache()
  }

  async register(
    schema: Schema,
    { compatibility = BACKWARD, separator = DEFAULT_SEPERATOR } = {},
  ): Promise<RegisteredSchema> {
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

  async getSchema(registryId: number): Promise<Schema> {
    const schema = this.cache.getSchema(registryId)
    if (schema) {
      return schema
    }

    const response = await this.api.Schema.find({ id: registryId })
    const foundSchema: { schema: string } = response.data()
    const rawSchema: Schema = JSON.parse(foundSchema.schema)

    return this.cache.setSchema(registryId, rawSchema)
  }

  async encode(registryId: number, jsonPayload: object) {
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

  async decode(buffer: Buffer) {
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

  async getRegistryId(subject: string, version: number) {
    const response = await this.api.Subject.version({ subject, version })
    const { id }: { id: string } = response.data()

    return id
  }
}
