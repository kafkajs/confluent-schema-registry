import avro from 'avsc'

import { Schema } from './@types'

export default class Cache {
  registryIdBySubject: { [key: string]: number }
  schemasByRegistryId: { [key: string]: Schema }

  constructor() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }

  getLatestRegistryId = (subject: string): number | undefined => this.registryIdBySubject[subject]

  setLatestRegistryId = (subject: string, id: number): number => {
    this.registryIdBySubject[subject] = id

    return this.registryIdBySubject[subject]
  }

  getSchema = (registryId: number): Schema => this.schemasByRegistryId[registryId]

  setSchema = (registryId: number, schema: Schema): Schema => {
    this.schemasByRegistryId[registryId] = avro.Type.forSchema(schema)

    return this.schemasByRegistryId[registryId]
  }

  clear = (): void => {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
