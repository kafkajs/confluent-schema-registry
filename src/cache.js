const avro = require('avsc')

module.exports = class Cache {
  constructor() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }

  getLatestRegistryId(subject) {
    return this.registryIdBySubject[subject]
  }

  setLatestRegistryId(subject, id) {
    this.registryIdBySubject[subject] = id
  }

  getSchema(registryId) {
    return this.schemasByRegistryId[registryId]
  }

  setSchema(registryId, schema) {
    return (this.schemasByRegistryId[registryId] = avro.Type.forSchema(schema))
  }

  clear() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
