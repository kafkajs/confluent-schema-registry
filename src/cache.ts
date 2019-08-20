import avro from 'avsc'

export default class Cache {
  registryIdBySubject: any
  schemasByRegistryId: any

  constructor() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }

  getLatestRegistryId(subject: any) {
    return this.registryIdBySubject[subject]
  }

  setLatestRegistryId(subject: any, id: any) {
    this.registryIdBySubject[subject] = id
  }

  getSchema(registryId: any) {
    return this.schemasByRegistryId[registryId]
  }

  setSchema(registryId: any, schema: any) {
    return (this.schemasByRegistryId[registryId] = avro.Type.forSchema(schema))
  }

  clear() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
