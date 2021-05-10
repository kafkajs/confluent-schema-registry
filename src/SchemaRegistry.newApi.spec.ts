import { v4 as uuid } from 'uuid'

import SchemaRegistry from './SchemaRegistry'
import {
  ConfluentSubject,
  ConfluentSchema,
  SchemaType,
  AvroConfluentSchema,
  JsonConfluentSchema,
} from './@types'
import API, { SchemaRegistryAPIClient } from './api'
import { COMPATIBILITY, DEFAULT_API_CLIENT_ID } from './constants'
import encodedAnotherPersonV2Avro from '../fixtures/avro/encodedAnotherPersonV2'
import encodedAnotherPersonV2Json from '../fixtures/json/encodedAnotherPersonV2'
import encodedAnotherPersonV2Proto from '../fixtures/proto/encodedAnotherPersonV2'
import encodedNestedV2Proto from '../fixtures/proto/encodedNestedV2'
import wrongMagicByte from '../fixtures/wrongMagicByte'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

const payload = { fullName: 'John Doe' }

type KnownSchemaTypes = Exclude<SchemaType, SchemaType.UNKNOWN>

describe('SchemaRegistry - new Api', () => {
  let schemaRegistry: SchemaRegistry

  const schemaStringsByType: Record<KnownSchemaTypes, any> = {
    [SchemaType.AVRO]: {
      random: (namespace: string) => `
      {
        "type": "record",
        "name": "RandomTest",
        "namespace": "${namespace}",
        "fields": [{ "type": "string", "name": "fullName" }]
      }
    `,
      otherRandom: (namespace: string) => `
      {
        "type": "record",
        "name": "RandomTest",
        "namespace": "${namespace}",
        "fields": [{ "type": "string", "name": "notFullName" }]
      }
    `,
      v1: `{
        "type": "record",
        "name": "AnotherPerson",
        "namespace": "com.org.domain.fixtures",
        "fields": [ { "type": "string", "name": "fullName" } ]
      }`,
      v2: `{
        "type": "record",
        "name": "AnotherPerson",
        "namespace": "com.org.domain.fixtures",
        "fields": [
          { "type": "string", "name": "fullName" },
          { "type": "string", "name": "city", "default": "Stockholm" }
        ]
      }`,
      encodedAnotherPersonV2: encodedAnotherPersonV2Avro,
    },
    [SchemaType.JSON]: {
      random: (namespace: string) => `
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
      otherRandom: (namespace: string) => `
      {
        "definitions" : {
          "record:${namespace}.RandomTest" : {
            "type" : "object",
            "required" : [ "notFullName" ],
            "additionalProperties" : false,
            "properties" : {
              "notFullName" : {
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
      encodedAnotherPersonV2: encodedAnotherPersonV2Json,
    },
    [SchemaType.PROTOBUF]: {
      random: (namespace: string) => `
      package ${namespace};
      message RandomTest {
        required string fullName = 1;
      }
    `,
      otherRandom: (namespace: string) => `
      package ${namespace};
      message RandomTest {
        required string notFullName = 1;
      }
    `,
      v1: `
      syntax = "proto2";
      package com.org.domain.fixtures;
      message AnotherPerson {
        required string fullName = 1;
      }
      `,
      v2: `
      syntax = "proto2";
      package com.org.domain.fixtures;
      message AnotherPerson {
        required string fullName = 1;
        optional string city = 2 [default = "Stockholm"];
      }
      `,
      encodedAnotherPersonV2: encodedAnotherPersonV2Proto,
    },
  }
  const types = Object.keys(schemaStringsByType).map(str => SchemaType[str]) as KnownSchemaTypes[]

  types.forEach(type =>
    describe(`${type}`, () => {
      const subject: ConfluentSubject = {
        name: [type, 'com.org.domain.fixtures', 'AnotherPerson'].join('.'),
      }
      const schema: ConfluentSchema = {
        type,
        schema: schemaStringsByType[type].v1,
      }

      beforeEach(async () => {
        schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
        await schemaRegistry.register(schema, { subject: subject.name })
      })

      describe('#register', () => {
        let namespace,
          Schema,
          subject: string,
          api: SchemaRegistryAPIClient,
          confluentSubject: ConfluentSubject,
          confluentSchema: ConfluentSchema

        beforeEach(() => {
          api = API(schemaRegistryAPIClientArgs)
          namespace = `N${uuid().replace(/-/g, '_')}`
          subject = `${namespace}.RandomTest`
          Schema = schemaStringsByType[type].random(namespace)
          confluentSubject = { name: subject }
          confluentSchema = { type, schema: Schema }
        })

        it('uploads the new schema', async () => {
          await expect(api.Subject.latestVersion({ subject })).rejects.toHaveProperty(
            'message',
            `${DEFAULT_API_CLIENT_ID} - Subject '${subject}' not found.`,
          )

          await expect(
            schemaRegistry.register(confluentSchema, { subject: confluentSubject.name }),
          ).resolves.toEqual({
            id: expect.any(Number),
          })
        })

        it('automatically cache the id and schema', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, {
            subject: confluentSubject.name,
          })

          expect(schemaRegistry.cache.getSchema(id)).toBeTruthy()
        })

        it('fetch and validate the latest schema id after registering a new schema', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, {
            subject: confluentSubject.name,
          })
          const latestSchemaId = await schemaRegistry.getLatestSchemaId(subject)

          expect(id).toBe(latestSchemaId)
        })

        it('set the default compatibility to BACKWARD', async () => {
          await schemaRegistry.register(confluentSchema, { subject: confluentSubject.name })
          const response = await api.Subject.config({ subject })
          expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.BACKWARD })
        })

        it('sets the compatibility according to param', async () => {
          await schemaRegistry.register(confluentSchema, {
            subject: confluentSubject.name,
            compatibility: COMPATIBILITY.NONE,
          })
          const response = await api.Subject.config({ subject })
          expect(response.data()).toEqual({ compatibilityLevel: COMPATIBILITY.NONE })
        })

        it('throws an error when the configured compatibility is different than defined in the client', async () => {
          await schemaRegistry.register(confluentSchema, { subject: confluentSubject.name })
          await api.Subject.updateConfig({ subject, body: { compatibility: COMPATIBILITY.FULL } })
          await expect(
            schemaRegistry.register(confluentSchema, { subject: confluentSubject.name }),
          ).rejects.toHaveProperty(
            'message',
            'Compatibility does not match the configuration (BACKWARD != FULL)',
          )
        })

        it('throws an error when the given schema string is invalid', async () => {
          const invalidSchema = `asdf`
          const invalidConfluentSchema: ConfluentSchema = {
            type,
            schema: invalidSchema,
          }
          await expect(
            schemaRegistry.register(invalidConfluentSchema, { subject: confluentSubject.name }),
          ).rejects.toHaveProperty('name', 'ConfluentSchemaRegistryArgumentError')
        })
      })

      describe('#encode', () => {
        beforeEach(async () => {
          await schemaRegistry.register(schema, { subject: subject.name })
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
            schema: schemaStringsByType[type].v1,
          }
          const confluentSchemaV2: ConfluentSchema = {
            type,
            schema: schemaStringsByType[type].v2,
          }

          const schema1 = await schemaRegistry.register(confluentSchemaV1, {
            subject: `${type}_test1`,
          })
          const schema2 = await schemaRegistry.register(confluentSchemaV2, {
            subject: `${type}_test2`,
          })
          expect(schema2.id).not.toEqual(schema1.id)

          const data = await schemaRegistry.encode(schema2.id, payload)

          expect(data).toMatchConfluentEncodedPayload({
            registryId: schema2.id,
            payload: Buffer.from(schemaStringsByType[type].encodedAnotherPersonV2),
          })
        })

        it('throws an error if the payload does not match the schema', async () => {
          const confluentSchema: ConfluentSchema = {
            type,
            schema: schemaStringsByType[type].v1,
          }
          const schema = await schemaRegistry.register(confluentSchema, {
            subject: `${type}_test`,
          })

          const badPayload = { asdf: 123 }

          await expect(schemaRegistry.encode(schema.id, badPayload)).rejects.toHaveProperty(
            'name',
            'ConfluentSchemaRegistryValidationError',
          )
        })
      })

      describe('#decode', () => {
        let registryId: number

        beforeEach(async () => {
          registryId = (await schemaRegistry.register(schema, { subject: subject.name })).id
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

        it.skip('throws an error if the payload does not match the schema', async () => {
          const badPayload = { asdf: 123 }
          // TODO: find a way to encode the bad payload with the registryId
          const buffer = Buffer.from(await schemaRegistry.encode(registryId, badPayload))

          await expect(schemaRegistry.decode(buffer)).rejects.toHaveProperty(
            'name',
            'ConfluentSchemaRegistryValidationError',
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
        let namespace: string, confluentSubject: ConfluentSubject, confluentSchema: ConfluentSchema

        beforeEach(() => {
          namespace = `N${uuid().replace(/-/g, '_')}`
          const subject = `${namespace}.RandomTest`
          const schema = schemaStringsByType[type].random(namespace)
          confluentSubject = { name: subject }
          confluentSchema = { type, schema: schema }
        })

        it('returns the registry id if the schema has already been registered under that subject', async () => {
          const { id } = await schemaRegistry.register(confluentSchema, {
            subject: confluentSubject.name,
          })

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
          const otherSchema = schemaStringsByType[type].otherRandom(namespace)
          const confluentOtherSchema: ConfluentSchema = {
            type,
            schema: otherSchema,
          }

          await schemaRegistry.register(confluentOtherSchema, { subject: confluentSubject.name })

          await expect(
            schemaRegistry.getRegistryIdBySchema(confluentSubject.name, confluentSchema),
          ).rejects.toHaveProperty('message', 'Confluent_Schema_Registry - Schema not found')
        })
      })
    }),
  )

  describe('PROTOBUF tests', () => {
    const v3 = `
      syntax = "proto2";
      package com.org.domain.fixtures;
      message SomeOtherMessage {
        required string bla = 1;
        required string foo = 2;
      }
      message AnotherPerson {
        required string fullName = 1;
        optional string city = 2 [default = "Stockholm"];
      }
      `,
      v3Opts = { [SchemaType.PROTOBUF]: { messageName: 'AnotherPerson' } },
      type = SchemaType.PROTOBUF

    beforeAll(() => {
      schemaRegistry = new SchemaRegistry(schemaRegistryArgs, v3Opts)
    })

    it('encodes using schemaOptions', async () => {
      const confluentSchemaV3: ConfluentSchema = {
        type,
        schema: v3,
      }

      const schema3 = await schemaRegistry.register(confluentSchemaV3, {
        subject: `${type}_test3`,
      })

      const data = await schemaRegistry.encode(schema3.id, payload)

      expect(data).toMatchConfluentEncodedPayload({
        registryId: schema3.id,
        payload: Buffer.from(schemaStringsByType[type].encodedAnotherPersonV2),
      })
    })

    it('decodes using schemaOptions', async () => {
      const confluentSchemaV3: ConfluentSchema = {
        type,
        schema: v3,
      }

      const schema3 = await schemaRegistry.register(confluentSchemaV3, {
        subject: `${type}_test3`,
      })

      const buffer = Buffer.from(await schemaRegistry.encode(schema3.id, payload))
      const data = await schemaRegistry.decode(buffer)

      expect(data).toEqual(payload)
    })

    describe('nested message types tests', () => {
      const v4 = `
      syntax = "proto2";
      package com.org.domain.fixtures;
      message OuterMessageType {
        required string data = 1;
        required InnerMessageType1 innerMessageType1 = 2;
        required InnerMessageType2 innerMessageType2 = 3;

        message InnerMessageType1 {
          required string someField = 1;
        }
        message InnerMessageType2 {
          required string someOtherField = 1;
        }
      }
      `,
        type = SchemaType.PROTOBUF,
        nestedPayload = {
          data: 'data-value',
          innerMessageType1: {
            someField: 'someField-value',
          },
          innerMessageType2: {
            someOtherField: 'someOtherField-value',
          },
        }

      beforeAll(() => {
        schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
      })

      it('encodes', async () => {
        const confluentSchemaV4: ConfluentSchema = {
          type,
          schema: v4,
        }

        const schema4 = await schemaRegistry.register(confluentSchemaV4, {
          subject: `${type}_test4`,
        })

        const data = await schemaRegistry.encode(schema4.id, nestedPayload)

        expect(data).toMatchConfluentEncodedPayload({
          registryId: schema4.id,
          payload: Buffer.from(encodedNestedV2Proto),
        })
      })

      it('decodes', async () => {
        const confluentSchemaV4: ConfluentSchema = {
          type,
          schema: v4,
        }

        const schema4 = await schemaRegistry.register(confluentSchemaV4, {
          subject: `${type}_test4`,
        })

        const buffer = Buffer.from(await schemaRegistry.encode(schema4.id, nestedPayload))
        const data = await schemaRegistry.decode(buffer)

        expect(data).toEqual(nestedPayload)
      })
    })
  })
})
