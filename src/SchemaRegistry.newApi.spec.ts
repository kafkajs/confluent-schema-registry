import { v4 as uuid } from 'uuid'
import { Agent } from 'http'

import SchemaRegistry, { ImportSubjects } from './SchemaRegistry'
import { ConfluentSubject, ConfluentSchema, SchemaType } from './@types'
import API, { SchemaRegistryAPIClient } from './api'
import { COMPATIBILITY, DEFAULT_API_CLIENT_ID } from './constants'
import encodedAnotherPersonV2Avro from '../fixtures/avro/encodedAnotherPersonV2'
import encodedAnotherPersonV2Json from '../fixtures/json/encodedAnotherPersonV2'
import encodedAnotherPersonV2Proto from '../fixtures/proto/encodedAnotherPersonV2'
import encodedNestedV2Proto from '../fixtures/proto/encodedNestedV2'
import wrongMagicByte from '../fixtures/wrongMagicByte'
import Ajv2020 from 'ajv8/dist/2020'
import Ajv from 'ajv'
import { ConfluentSchemaRegistryValidationError } from './errors'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const agent = new Agent({ keepAlive: true })
const schemaRegistryArgs = { host: REGISTRY_HOST, agent }

const payload = { fullName: 'John Doe' }

type KnownSchemaTypes = Exclude<SchemaType, SchemaType.UNKNOWN>

describe('SchemaRegistry - new Api', () => {
  let schemaRegistry: SchemaRegistry

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

          const exposedPrivateApi = (schemaRegistry as unknown) as { api: SchemaRegistryAPIClient }
          const spy = jest.spyOn(exposedPrivateApi.api.Schema, 'find')

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

    const protoV3 = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      message AnotherPerson {
        string city = 2 [default = "Stockholm"];
      }
      `

    const protoContact = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      message ContactMessage {
        string email = 1;
      }
      `

    const protoEmployee = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      import "Contact.proto";
      message Employee {
        string city = 1 [default = "Stockholm"];
        ContactMessage contact = 2;
      }
      `

    const protoOffice = `
    syntax = "proto3";
    package com.org.domain.fixtures;
    message Office {
      string address = 1;
    }
    `

    const protoCompany = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      import "Employee.proto";
      import "Office.proto";
      message Company {
        Employee employee = 1;
        Office office = 2;
      }
    `

    const protoA = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      
      import "B.proto";
      import "C.proto";
      
      message messageA {
        string id = 1;
        messageB valuesB = 2;
        messageC valuesC = 3;
      }
    `

    const protoB = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      
      import "D.proto";
      
      message messageB {
        string id = 1;
        messageD meta = 2;
        string value = 3;
      }
    `

    const protoC = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      
      import "D.proto";
      
      message messageC {
        string id = 1;
        messageD meta = 2;
      }
    `
    // repeated messageD values = 3;

    const protoD = `
      syntax = "proto3";
      package com.org.domain.fixtures;
      
      message messageD {
        string user = 1;
        string time = 2;
      }
    `

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

      it('register and encode protocol buffer v3 schema', async () => {
        const confluentSchemaV3: ConfluentSchema = {
          type,
          schema: protoV3,
        }

        const schema1 = await schemaRegistry.register(confluentSchemaV3, {
          subject: `${type}_test_protoV3-value`,
        })

        await schemaRegistry.encode(schema1.id, payload)
      })

      it('register and encode protocol buffer v3 schema with import', async () => {
        const confluentSchemaV3: ConfluentSchema = {
          type,
          schema: protoCompany,
        }
        const officeSchema: ConfluentSchema = {
          type,
          schema: protoOffice,
        }

        const contactSchema: ConfluentSchema = {
          type,
          schema: protoContact,
        }

        const employeeSchema: ConfluentSchema = {
          type,
          schema: protoEmployee,
        }

        await schemaRegistry.register(officeSchema, { subject: 'Office.proto' })
        await schemaRegistry.register(contactSchema, { subject: 'Contact.proto' })
        await schemaRegistry.register(employeeSchema, { subject: 'Employee.proto' })

        const schema1 = await schemaRegistry.register(confluentSchemaV3, {
          subject: `${type}_test_protoImportsV3-value`,
        })

        // Check that we can encode with the cached version from the register() call
        const payload = {
          employee: { contact: { email: 'example@example.com' } },
          office: { address: 'Stockholm' },
        }

        const encoded1 = await schemaRegistry.encode(schema1.id, payload)
        const decoded1 = await schemaRegistry.decode(encoded1)

        // Clear the cache and try again to exercise getSchema()
        schemaRegistry.cache.clear()
        const encoded2 = await schemaRegistry.encode(schema1.id, payload)
        schemaRegistry.cache.clear()
        const decoded2 = await schemaRegistry.decode(encoded2)

        expect(encoded1).toEqual(encoded2)
        expect(decoded1).toEqual(decoded2)

        // Check the default value
        expect(decoded1.employee.city).toEqual('Stockholm')

        // Check the value in the field defined in imported schema
        expect(decoded1.employee.contact.email).toEqual('example@example.com')
      })

      it('no in-place changes to cached entry of imported schema', async () => {
        const officeSchema: ConfluentSchema = {
          type,
          schema: protoOffice,
        }

        const companySchema: ConfluentSchema = {
          type,
          schema: protoCompany,
        }

        const contactSchema: ConfluentSchema = {
          type,
          schema: protoContact,
        }

        const employeeSchema: ConfluentSchema = {
          type,
          schema: protoEmployee,
        }

        await schemaRegistry.register(officeSchema, { subject: 'Office.proto' })
        await schemaRegistry.register(contactSchema, {
          subject: `${type}_test_contactSchema-value`,
        })
        await schemaRegistry.register(employeeSchema, {
          subject: `${type}_test_employeeSchema-value`,
        })

        const importSubjects: ImportSubjects = async (referenceName: string) => {
          switch (referenceName) {
            case 'Contact.proto':
              return `${type}_test_contactSchema-value`
            case 'Employee.proto':
              return `${type}_test_employeeSchema-value`
            case 'Office.proto':
              return `${type}_test_officeSchema-value`
          }
          throw `unknown reference ${referenceName}`
        }

        // Register a schema with no dependencies and store it before registering anything else.
        const registeredOfficeSchemaId = (
          await schemaRegistry.register(officeSchema, {
            subject: `${type}_test_officeSchema-value`,
          })
        ).id

        const registeredOfficeSchemaBefore = JSON.stringify(
          await schemaRegistry.getSchema(registeredOfficeSchemaId),
        )

        // Register a new schema that imports our already registered Office schema.
        await schemaRegistry.register(companySchema, {
          subject: `${type}_test_companySchema-value`,
          importSubjects,
        })

        // Check that registering this new schema did not modify the original imported schema.
        const registeredOfficeSchemaAfter = JSON.stringify(
          await schemaRegistry.getSchema(registeredOfficeSchemaId),
        )

        expect(registeredOfficeSchemaBefore).toEqual(registeredOfficeSchemaAfter)
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

      it('handles references shared through multiple files', async () => {
        const aSchema: ConfluentSchema = { type, schema: protoA }
        const bSchema: ConfluentSchema = { type, schema: protoB }
        const cSchema: ConfluentSchema = { type, schema: protoC }
        const dSchema: ConfluentSchema = { type, schema: protoD }

        const importSubjects: ImportSubjects = async (referenceName: string) => {
          switch (referenceName) {
            case 'A.proto':
              return `${type}_test_aSchema-value`
            case 'B.proto':
              return `${type}_test_bSchema-value`
            case 'C.proto':
              return `${type}_test_cSchema-value`
            case 'D.proto':
              return `${type}_test_dSchema-value`
          }
          throw `unknown reference ${referenceName}`
        }

        await schemaRegistry.register(dSchema, { subject: `${type}_test_dSchema-value` })

        await schemaRegistry.register(cSchema, {
          subject: `${type}_test_cSchema-value`,
          importSubjects,
        })

        await schemaRegistry.register(bSchema, {
          subject: `${type}_test_bSchema-value`,
          importSubjects,
        })

        const registeredASchema = await schemaRegistry.register(aSchema, {
          subject: `${type}_test_aSchema-value`,
          importSubjects,
        })
        const registeredASchemaId = registeredASchema.id

        const payload = {
          id: 'iAmIdA',
          valuesB: {
            id: 'iAmIdA.B',
            meta: { user: 'iAmUserA.B.D', time: 'iAmTimeA.B.D' },
            value: 'iAMValueA.B',
          },
          valuesC: {
            id: 'iAmIdA.C',
            meta: {}, // user: 'iAmUserA.C.meta', time: 'iAmTimeA.C.meta' },
            // messageD: [
            //   { user: 'iAmUserA.C.0.D', time: 'iAmTimeA.C.0.D' },
            //   { user: 'iAmUserA.C.1.D', time: 'iAmTimeA.C.1.D' },
            // ],
          },
        }
        const buffer = Buffer.from(await schemaRegistry.encode(registeredASchemaId, payload))
        const data = await schemaRegistry.decode(buffer)

        expect(data).toEqual(payload)
      })
    })
  })

  describe('JSON Schema tests', () => {
    describe('passing an Ajv instance in the constructor', () => {
      test.each([
        ['Ajv 7', new Ajv()],
        ['Ajv2020', new Ajv2020()],
      ])(
        'Errors are thrown with their path in %s when the validation fails',
        async (_, ajvInstance) => {
          expect.assertions(3)
          const registry = new SchemaRegistry(schemaRegistryArgs, {
            [SchemaType.JSON]: { ajvInstance },
          })
          const subject: ConfluentSubject = {
            name: [SchemaType.JSON, 'com.org.domain.fixtures', 'AnotherPerson'].join('.'),
          }
          const schema: ConfluentSchema = {
            type: SchemaType.JSON,
            schema: schemaStringsByType[SchemaType.JSON].v1,
          }

          const { id: schemaId } = await registry.register(schema, { subject: subject.name })

          try {
            await schemaRegistry.encode(schemaId, { fullName: true })
          } catch (error) {
            expect(error).toBeInstanceOf(ConfluentSchemaRegistryValidationError)
            expect(error.message).toEqual('invalid payload')
            expect(error.paths).toEqual([['/fullName']])
          }
        },
      )
    })
  })

  describe('Avro tests', () => {
    it('uses reader schema if specified (avro-only)', async () => {
      const subject: ConfluentSubject = {
        name: [SchemaType.AVRO, 'com.org.domain.fixtures', 'AnotherPerson'].join('.'),
      }
      const schema: ConfluentSchema = {
        type: SchemaType.AVRO,
        schema: schemaStringsByType[SchemaType.AVRO].v1,
      }
      const registryId = (await schemaRegistry.register(schema, { subject: subject.name })).id
      const writerBuffer = Buffer.from(await schemaRegistry.encode(registryId, payload))
      const readerSchema = JSON.parse(schemaStringsByType[SchemaType.AVRO].v2)

      await expect(
        schemaRegistry.decode(writerBuffer, { [SchemaType.AVRO]: { readerSchema } }),
      ).resolves.toHaveProperty('city', 'Stockholm')

      const registeredReaderSchema = await schemaRegistry.getSchema(registryId)
      await expect(
        schemaRegistry.decode(writerBuffer, {
          [SchemaType.AVRO]: { readerSchema: registeredReaderSchema },
        }),
      )
    })
  })

  describe('JSON Schema tests', () => {
    describe('passing an Ajv instance in the constructor', () => {
      test.each([
        ['Ajv 7', new Ajv()],
        ['Ajv2020', new Ajv2020()],
      ])(
        'Errors are thrown with their path in %s when the validation fails',
        async (_, ajvInstance) => {
          expect.assertions(3)
          const registry = new SchemaRegistry(schemaRegistryArgs, {
            [SchemaType.JSON]: { ajvInstance },
          })
          const subject: ConfluentSubject = {
            name: [SchemaType.JSON, 'com.org.domain.fixtures', 'AnotherPerson'].join('.'),
          }
          const schema: ConfluentSchema = {
            type: SchemaType.JSON,
            schema: schemaStringsByType[SchemaType.JSON].v1,
          }

          const { id: schemaId } = await registry.register(schema, { subject: subject.name })

          try {
            await schemaRegistry.encode(schemaId, { fullName: true })
          } catch (error) {
            expect(error).toBeInstanceOf(ConfluentSchemaRegistryValidationError)
            expect(error.message).toEqual('invalid payload')
            expect(error.paths).toEqual([['/fullName']])
          }
        },
      )
    })
  })

  describe('Avro tests', () => {
    it('uses reader schema if specified (avro-only)', async () => {
      const subject: ConfluentSubject = {
        name: [SchemaType.AVRO, 'com.org.domain.fixtures', 'AnotherPerson'].join('.'),
      }
      const schema: ConfluentSchema = {
        type: SchemaType.AVRO,
        schema: schemaStringsByType[SchemaType.AVRO].v1,
      }
      const registryId = (await schemaRegistry.register(schema, { subject: subject.name })).id
      const writerBuffer = Buffer.from(await schemaRegistry.encode(registryId, payload))
      const readerSchema = JSON.parse(schemaStringsByType[SchemaType.AVRO].v2)

      await expect(
        schemaRegistry.decode(writerBuffer, { [SchemaType.AVRO]: { readerSchema } }),
      ).resolves.toHaveProperty('city', 'Stockholm')

      const registeredReaderSchema = await schemaRegistry.getSchema(registryId)
      await expect(
        schemaRegistry.decode(writerBuffer, {
          [SchemaType.AVRO]: { readerSchema: registeredReaderSchema },
        }),
      )
    })
  })
})
