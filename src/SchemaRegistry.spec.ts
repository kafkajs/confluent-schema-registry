import path from 'path'
import { v4 as uuid } from 'uuid'

import { readAVSC } from './utils'
import SchemaRegistry from './SchemaRegistry'
import API, { SchemaRegistryAPIClient } from './api'
import { COMPATIBILITY, DEFAULT_API_CLIENT_ID } from './constants'
import encodedAnotherPersonV2 from '../fixtures/avro/encodedAnotherPersonV2'
import wrongMagicByte from '../fixtures/wrongMagicByte'
import { RawAvroSchema } from './@types'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

const personSchema = readAVSC(path.join(__dirname, '../fixtures/avsc/person.avsc'))
const payload = { fullName: 'John Doe' } // eslint-disable-line @typescript-eslint/camelcase

describe('SchemaRegistry - old AVRO api', () => {
  let schemaRegistry: SchemaRegistry

  beforeEach(async () => {
    schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
    await schemaRegistry.register(personSchema)
  })

  describe('#register', () => {
    let namespace: string, Schema: RawAvroSchema, subject: string, api: SchemaRegistryAPIClient

    beforeEach(() => {
      api = API(schemaRegistryAPIClientArgs)
      namespace = `N${uuid().replace(/-/g, '_')}`
      subject = `${namespace}.RandomTest`
      Schema = {
        namespace,
        type: 'record',
        name: 'RandomTest',
        fields: [{ type: 'string', name: 'fullName' }],
      }
    })

    it('uploads the new schema', async () => {
      await expect(api.Subject.latestVersion({ subject })).rejects.toHaveProperty(
        'message',
        `${DEFAULT_API_CLIENT_ID} - Subject '${namespace}.${Schema.name}' not found.`,
      )

      await expect(schemaRegistry.register(Schema)).resolves.toEqual({ id: expect.any(Number) })
    })

    it('automatically cache the id and schema', async () => {
      const { id } = await schemaRegistry.register(Schema)

      expect(schemaRegistry.cache.getSchema(id)).toBeTruthy()
    })

    it('fetch and validate the latest schema id after registering a new schema', async () => {
      const { id } = await schemaRegistry.register(Schema)
      const latestSchemaId = await schemaRegistry.getLatestSchemaId(subject)

      expect(id).toBe(latestSchemaId)
    })

    it('set the default compatibility to BACKWARD', async () => {
      await schemaRegistry.register(Schema)
      const response = await api.Subject.config({ subject })
      expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.BACKWARD })
    })

    it('sets the compatibility according to param', async () => {
      await schemaRegistry.register(Schema, { compatibility: COMPATIBILITY.NONE })
      const response = await api.Subject.config({ subject })
      expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.NONE })
    })

    it('throws an error when schema does not have a name', async () => {
      delete Schema.name
      await expect(schemaRegistry.register(Schema)).rejects.toHaveProperty(
        'message',
        'Invalid name: undefined',
      )
    })

    it('throws an error when schema does not have a namespace', async () => {
      delete Schema.namespace
      await expect(schemaRegistry.register(Schema)).rejects.toHaveProperty(
        'message',
        'Invalid namespace: undefined',
      )
    })

    it('accepts schema without a namespace when subject is specified', async () => {
      delete Schema.namespace
      const nonNamespaced = readAVSC(path.join(__dirname, '../fixtures/avsc/non_namespaced.avsc'))
      await expect(schemaRegistry.register(nonNamespaced, { subject })).resolves.toEqual({
        id: expect.any(Number),
      })
    })

    it('throws an error when the configured compatibility is different than defined in the client', async () => {
      await schemaRegistry.register(Schema)
      await api.Subject.updateConfig({ subject, body: { compatibility: COMPATIBILITY.FULL } })
      await expect(schemaRegistry.register(Schema)).rejects.toHaveProperty(
        'message',
        'Compatibility does not match the configuration (BACKWARD != FULL)',
      )
    })
  })

  describe('#encode', () => {
    beforeEach(async () => {
      await schemaRegistry.register(personSchema)
    })

    it('throws an error if registryId is empty', async () => {
      await expect(schemaRegistry.encode(undefined, payload)).rejects.toHaveProperty(
        'message',
        'Invalid registryId: undefined',
      )
    })

    it('encodes using a defined registryId', async () => {
      const SchemaV1 = Object.assign({}, personSchema, {
        name: 'AnotherPerson',
        fields: [{ type: 'string', name: 'fullName' }],
      })
      const SchemaV2 = Object.assign({}, SchemaV1, {
        fields: [
          { type: 'string', name: 'fullName' },
          { type: 'string', name: 'city', default: 'Stockholm' },
        ],
      })

      const schema1 = await schemaRegistry.register(SchemaV1)
      const schema2 = await schemaRegistry.register(SchemaV2)
      expect(schema2.id).not.toEqual(schema1.id)

      const data = await schemaRegistry.encode(schema2.id, payload)
      expect(data).toMatchConfluentEncodedPayload({
        registryId: schema2.id,
        payload: Buffer.from(encodedAnotherPersonV2),
      })
    })
  })

  describe('#decode', () => {
    let registryId: number

    beforeEach(async () => {
      registryId = (await schemaRegistry.register(personSchema)).id
    })

    it('decodes data', async () => {
      const buffer = Buffer.from(await schemaRegistry.encode(registryId, payload))
      const data = await schemaRegistry.decode(buffer)

      expect(data).toEqual(payload)
    })

    it('throws an error if the magic byte is not supported', async () => {
      const buffer = Buffer.from(wrongMagicByte)
      await expect(schemaRegistry.decode(buffer)).rejects.toHaveProperty(
        'message',
        'Message encoded with magic byte {"type":"Buffer","data":[48]}, expected {"type":"Buffer","data":[0]}',
      )
    })

    it('caches the schema', async () => {
      const buffer = Buffer.from(await schemaRegistry.encode(registryId, payload))

      schemaRegistry.cache.clear()
      await schemaRegistry.decode(buffer)

      expect(schemaRegistry.cache.getSchema(registryId)).toBeTruthy()
    })

    it('creates a single origin request for a schema cache-miss', async () => {
      const buffer = Buffer.from(await schemaRegistry.encode(registryId, payload))

      schemaRegistry.cache.clear()

      const spy = jest.spyOn((schemaRegistry as any).api.Schema, 'find')

      await Promise.all([
        schemaRegistry.decode(buffer),
        schemaRegistry.decode(buffer),
        schemaRegistry.decode(buffer),
      ])

      expect(spy).toHaveBeenCalledTimes(1)
    })

    describe('when the cache is populated', () => {
      it('uses the cache data', async () => {
        const buffer = Buffer.from(await schemaRegistry.encode(registryId, payload))
        expect(schemaRegistry.cache.getSchema(registryId)).toBeTruthy()

        jest.spyOn(schemaRegistry.cache, 'setSchema')
        await schemaRegistry.decode(buffer)

        expect(schemaRegistry.cache.setSchema).not.toHaveBeenCalled()
      })
    })
  })

  describe('#getRegistryIdBySchema', () => {
    let namespace: string, Schema: RawAvroSchema, subject: string

    beforeEach(() => {
      namespace = `N${uuid().replace(/-/g, '_')}`
      subject = `${namespace}.RandomTest`
      Schema = JSON.parse(`
        {
          "type": "record",
          "name": "RandomTest",
          "namespace": "${namespace}",
          "fields": [{ "type": "string", "name": "fullName" }]
        }
      `)
    })

    it('returns the registry id if the schema has already been registered under that subject', async () => {
      const { id } = await schemaRegistry.register(Schema, { subject })

      await expect(schemaRegistry.getRegistryIdBySchema(subject, Schema)).resolves.toEqual(id)
    })

    it('throws an error if the subject does not exist', async () => {
      await expect(schemaRegistry.getRegistryIdBySchema(subject, Schema)).rejects.toHaveProperty(
        'message',
        `Confluent_Schema_Registry - Subject '${namespace}.${Schema.name}' not found.`,
      )
    })

    it('throws an error if the schema has not been registered under that subject', async () => {
      const otherSchema = JSON.parse(`
      {
        "type": "record",
        "name": "RandomTest",
        "namespace": "${namespace}",
        "fields": [{ "type": "string", "name": "notFullName" }]
      }
    `)
      await schemaRegistry.register(otherSchema, { subject })

      await expect(schemaRegistry.getRegistryIdBySchema(subject, Schema)).rejects.toHaveProperty(
        'message',
        'Confluent_Schema_Registry - Schema not found',
      )
    })
  })
})
