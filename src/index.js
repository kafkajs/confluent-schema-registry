const { encode, MAGIC_BYTE } = require('./encoder')
const decode = require('./decoder')
const { BACKWARD } = require('./compatibility')
const API = require('./api')
const Cache = require('./cache')
const {
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
} = require('./errors')

// Based on https://github.com/mtth/avsc/issues/140
const collectInvalidPaths = (schema, jsonPayload) => {
  const paths = []
  schema.isValid(jsonPayload, {
    errorHook: path => {
      paths.push(path)
    },
  })

  return paths
}

module.exports = class SchemaRegistry {
  constructor({ host, retry = {} }) {
    this.api = API({ host, retry })
    this.cache = new Cache()
  }

  async register(schema, { compatibility = BACKWARD, separator = '.' } = {}) {
    if (!schema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${schema.name}`)
    }

    if (!schema.namespace) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${schema.namespace}`)
    }

    const subject = [schema.namespace, schema.name].join(separator)

    try {
      const response = await this.api.Subject.config({ subject })
      const { compatibilityLevel } = response.data()

      if (compatibilityLevel.toUpperCase() !== compatibility) {
        throw new ConfluentSchemaRegistryCompatibilityError(
          `Compatibility does not match the configuration (${compatibility} != ${compatibilityLevel.toUpperCase()})`,
        )
      }
    } catch (e) {
      if (e.status !== 404) {
        throw e
      }

      if (compatibility) {
        await this.api.Subject.updateConfig({ subject, body: { compatibility } })
      }
    }

    const response = await this.api.Subject.register({
      subject,
      body: { schema: JSON.stringify(schema) },
    })

    const registeredSchema = response.data()
    this.cache.setLatestRegistryId(subject, registeredSchema.id)
    this.cache.setSchema(registeredSchema.id, schema)

    return registeredSchema
  }

  async getSchema(registryId) {
    const schema = this.cache.getSchema(registryId)
    if (schema) return schema

    const response = await this.api.Schema.find({ id: registryId })
    const rawSchema = JSON.parse(response.data().schema)
    return this.cache.setSchema(registryId, rawSchema)
  }

  async encode(registryId, jsonPayload) {
    if (!registryId) {
      throw new ConfluentSchemaRegistryArgumentError(
        `Invalid registryId: ${JSON.stringify(registryId)}`,
      )
    }

    const schema = await this.getSchema(registryId)

    let avroPayload
    try {
      avroPayload = schema.toBuffer(jsonPayload)
    } catch (err) {
      err.paths = collectInvalidPaths(schema, jsonPayload)
      throw err
    }

    return encode(registryId, avroPayload)
  }

  async decode(buffer) {
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

  async getRegistryId(subject, version) {
    const response = await this.api.Subject.version({ subject, version })

    return response.data().id
  }
}
