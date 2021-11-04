import { AvroSchema, Schema, SchemaType } from './@types'

type CacheEntry = { type: SchemaType; schema: Schema | AvroSchema }

export default class Cache {
  registryIdBySubject: { [key: string]: number }
  schemasByRegistryId: { [key: string]: CacheEntry }

  constructor() {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }

  getLatestRegistryId = (subject: string): number | undefined => this.registryIdBySubject[subject]

  setLatestRegistryId = (subject: string, id: number): number => {
    this.registryIdBySubject[subject] = id

    return this.registryIdBySubject[subject]
  }

  getSchema = (registryId: number): CacheEntry | undefined => this.schemasByRegistryId[registryId]

  setSchema = (registryId: number, type: SchemaType, schema: Schema): CacheEntry => {
    this.schemasByRegistryId[registryId] = { type, schema }

    return this.schemasByRegistryId[registryId]
  }

  clear = (): void => {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
