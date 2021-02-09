import path from 'path'
import { v4 as uuid } from 'uuid'

import { readAVSC } from './utils'
import SchemaRegistry from './SchemaRegistry'
import { ConfluentSubject, ConfluentSchema, SchemaType } from './@types'
import API from './api'
import { COMPATIBILITY, DEFAULT_API_CLIENT_ID } from './constants'
import encodedAnotherPersonV2 from '../fixtures/encodedAnotherPersonV2'
import wrongMagicByte from '../fixtures/wrongMagicByte'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

const personSchema = readAVSC(path.join(__dirname, '../fixtures/avsc/person.avsc'))
const subject: ConfluentSubject = { name: [personSchema.namespace, personSchema.name].join('.') }
const schema: ConfluentSchema = {
  type: SchemaType.AVRO,
  schemaString: JSON.stringify(personSchema),
}

const payload = { fullName: 'John Doe' }

describe('SchemaRegistry', () => {
  let schemaRegistry: SchemaRegistry

  beforeEach(async () => {
    schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
    await schemaRegistry.register(schema, subject)
  })

  const schemaStringsByType = {
    [SchemaType.AVRO.toString()]: {
      random: namespace => `
      {
        "type": "record",
        "name": "RandomTest",
        "namespace": "${namespace}",
        "fields": [{ "type": "string", "name": "fullName" }]
      }
    `,
      v1: JSON.stringify(
        Object.assign({}, personSchema, {
          name: 'AnotherPerson',
          fields: [{ type: 'string', name: 'fullName' }],
        }),
      ),
      v2: JSON.stringify(
        Object.assign({}, personSchema, {
          name: 'AnotherPerson',
          fields: [
            { type: 'string', name: 'fullName' },
            { type: 'string', name: 'city', default: 'Stockholm' },
          ],
        }),
      ),
    },
    [SchemaType.JSON.toString()]: {
      random: namespace => `
      {
        "definitions" : {
          "record:${namespace}.RandomTest" : {
            "type" : "object",
            "required" : [ "fullName" ],
            "additionalProperties" : false,
            "properties" : {
              "fullName" : {
                "type" : "string"
              }
            }
          }
        },
        "$ref" : "#/definitions/record:${namespace}.RandomTest"
      }
    `,
      v1: `
      {
        "title": "AnotherPerson",
        "type": "object",
        "required": [
          "fullName"
        ],
        "properties": {
          "fullName": {
            "type": "string",
            "pattern": "^.*$"
          }
        }
      }
      `,
      v2: `
      {
        "title": "AnotherPerson",
        "type": "object",
        "required": [
          "fullName"
        ],
        "properties": {
          "fullName": {
            "type": "string",
            "pattern": "^.*$"
          },
          "city": {
            "type": "string",
            "pattern": "^.*$"
          }
        }
      }
      `,
    },
    [SchemaType.PROTOBUF.toString()]: {
      random: namespace => `
      message RandomTest {
        required string full_name = 1;
      }
    `,
      v1: `
      syntax = "proto2";
      message AnotherPerson {
        required string full_name = 1;
      }
      `,
      v2: `
      syntax = "proto2";
      message AnotherPerson {
        required string full_name = 1;
        optional string city = 2 [default = "Stockholm"];
      }
      `,
    },
  }
  const types = Object.keys(schemaStringsByType).map(str => SchemaType[str])

  types.forEach(type =>
    describe(`${type.toString()}`, () => {
      describe('#register', () => {
        let namespace,
          Schema,
          subject,
          api,
          confluentSubject: ConfluentSubject,
          confluentSchema: ConfluentSchema

        beforeEach(() => {
          api = API(schemaRegistryAPIClientArgs)
          namespace = `N${uuid().replace(/-/g, '_')}`
          subject = `${namespace}.RandomTest`
          Schema = schemaStringsByType[type.toString()].random(namespace)
          confluentSubject = { name: subject }
          confluentSchema = { type, schemaString: Schema }
        })

        it('uploads the new schema', async () => {
          await expect(api.Subject.latestVersion({ subject })).rejects.toHaveProperty(
            'message',
            `${DEFAULT_API_CLIENT_ID} - Subject '${subject}' not found.`,
          )

          await expect(schemaRegistry.register(confluentSchema, confluentSubject)).resolves.toEqual(
            {
              id: expect.any(Number),
            },
          )
        })

        it('automatically cache the id and schema', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, confluentSubject)

          expect(schemaRegistry.cache.getSchema(id)).toBeTruthy()
        })

        it('fetch and validate the latest schema id after registering a new schema', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, confluentSubject)
          const latestSchemaId = await schemaRegistry.getLatestSchemaId(subject)

          expect(id).toBe(latestSchemaId)
        })

        it('set the default compatibility to BACKWARD', async () => {
          await schemaRegistry.register(confluentSchema, confluentSubject)
          const response = await api.Subject.config({ subject })
          expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.BACKWARD })
        })

        it('sets the compatibility according to param', async () => {
          await schemaRegistry.register(confluentSchema, confluentSubject, {
            compatibility: COMPATIBILITY.NONE,
          })
          const response = await api.Subject.config({ subject })
          expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.NONE })
        })

        it('throws an error when the configured compatibility is different than defined in the client', async () => {
          await schemaRegistry.register(confluentSchema, confluentSubject)
          await api.Subject.updateConfig({ subject, body: { compatibility: COMPATIBILITY.FULL } })
          await expect(
            schemaRegistry.register(confluentSchema, confluentSubject),
          ).rejects.toHaveProperty(
            'message',
            'Compatibility does not match the configuration (BACKWARD != FULL)',
          )
        })

        it('throws an error when the given schema string is invalid', async () => {
          const invalidSchema = `
        {
          "type": "record",
          "name": "RandomTest",
          "namespace": "${namespace}",
        }
      `
          const invalidConfluentSchema: ConfluentSchema = {
            type,
            schemaString: invalidSchema,
          }
          await expect(
            schemaRegistry.register(invalidConfluentSchema, confluentSubject),
          ).rejects.toHaveProperty(
            'message',
            'Confluent_Schema_Registry - Either the input schema or one its references is invalid',
          )
        })
      })

      describe('#encode', () => {
        beforeEach(async () => {
          await schemaRegistry.register(schema, subject)
        })

        it('throws an error if registryId is empty', async () => {
          await expect(schemaRegistry.encode(undefined, payload)).rejects.toHaveProperty(
            'message',
            'Invalid registryId: undefined',
          )
        })

        it('encodes using a defined registryId', async () => {
          const confluentSchemaV1: ConfluentSchema = {
            type,
            schemaString: schemaStringsByType[type.toString()].v1,
          }
          const confluentSchemaV2: ConfluentSchema = {
            type,
            schemaString: schemaStringsByType[type.toString()].v2,
          }

          const schema1 = await schemaRegistry.register(confluentSchemaV1, {
            name: `${type.toString()}_test1`,
          })
          const schema2 = await schemaRegistry.register(confluentSchemaV2, {
            name: `${type.toString()}_test2`,
          })
          expect(schema2.id).not.toEqual(schema1.id)

          const data = await schemaRegistry.encode(schema2.id, payload)

          expect(data).toMatchConfluentAvroEncodedPayload({
            registryId: schema2.id,
            payload: Buffer.from(encodedAnotherPersonV2),
          })
        })
      })

      describe('#decode', () => {
        let registryId

        beforeEach(async () => {
          registryId = (await schemaRegistry.register(schema, subject)).id
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
        let namespace, confluentSubject: ConfluentSubject, confluentSchema: ConfluentSchema

        beforeEach(() => {
          namespace = `N${uuid().replace(/-/g, '_')}`
          const subject = `${namespace}.RandomTest`
          const schema = `
        {
          "type": "record",
          "name": "RandomTest",
          "namespace": "${namespace}",
          "fields": [{ "type": "string", "name": "full_name" }]
        }
      `
          confluentSubject = { name: subject }
          confluentSchema = { type, schemaString: schema }
        })

        it('returns the registry id if the schema has already been registered under that subject', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, confluentSubject)

          await expect(
            schemaRegistry.getRegistryIdBySchema(confluentSubject.name, confluentSchema),
          ).resolves.toEqual(id)
        })

        it('throws an error if the subject does not exist', async () => {
          await expect(
            schemaRegistry.getRegistryIdBySchema(confluentSubject.name, confluentSchema),
          ).rejects.toHaveProperty(
            'message',
            `Confluent_Schema_Registry - Subject '${confluentSubject.name}' not found.`,
          )
        })

        it('throws an error if the schema has not been registered under that subject', async () => {
          const otherSchema = `
      {
        "type": "record",
        "name": "RandomTest",
        "namespace": "${namespace}",
        "fields": [{ "type": "string", "name": "not_full_name" }]
      }
    `
          const confluentOtherSchema: ConfluentSchema = {
            type,
            schemaString: otherSchema,
          }

          await schemaRegistry.register(confluentOtherSchema, confluentSubject)

          await expect(
            schemaRegistry.getRegistryIdBySchema(confluentSubject.name, confluentSchema),
          ).rejects.toHaveProperty('message', 'Confluent_Schema_Registry - Schema not found')
        })
      })
    }),
  )
})
