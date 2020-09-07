import { ConfluentSchema } from './@types'

export default class Cache {
  registryIdBySubject: { [key: string]: number }
  schemasByRegistryId: { [key: string]: ConfluentSchema }

  constructor() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }

  getLatestRegistryId = (subject: string): number | undefined => this.registryIdBySubject[subject]

  setLatestRegistryId = (subject: string, id: number): number => {
    this.registryIdBySubject[subject] = id

    return this.registryIdBySubject[subject]
  }

  getSchema = (registryId: number): ConfluentSchema => this.schemasByRegistryId[registryId]

  setSchema = (registryId: number, schema: ConfluentSchema) => {
    this.schemasByRegistryId[registryId] = schema

    return this.schemasByRegistryId[registryId]
  }

  clear = (): void => {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
