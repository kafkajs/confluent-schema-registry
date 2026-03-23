import SchemaRegistry, { RegisteredSchema } from './SchemaRegistry'
import API from './api'
import { JsonConfluentSchema, SchemaType } from './@types'
import Ajv from 'ajv'
import { ConfluentSchemaRegistryValidationError } from './errors'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

const TestSchemas = {
  ThirdLevelSchema: {
    type: SchemaType.JSON,
    schema: `
		{
			"$id": "https://example.com/schemas/ThirdLevel",
			"type": "object",
			"properties": {
				"id3": { "type": "number" }
			}
		}
		`,
  } as JsonConfluentSchema,

  SecondLevelASchema: {
    type: SchemaType.JSON,
    schema: `
		{
			"$id": "https://example.com/schemas/SecondLevelA",
			"type": "object",
			"properties": {
				"id2a": { "type": "number" },
				"level2a": { "$ref": "https://example.com/schemas/ThirdLevel" }
			}
		}
		`,
    references: [
      {
        name: 'https://example.com/schemas/ThirdLevel',
        subject: 'JSON:ThirdLevel',
        version: undefined,
      },
    ],
  } as JsonConfluentSchema,

  SecondLevelBSchema: {
    type: SchemaType.JSON,
    schema: `
		{
			"$id": "https://example.com/schemas/SecondLevelB",
			"type": "object",
			"properties": {
				"id2b": { "type": "number" },
				"level2b": { "$ref": "https://example.com/schemas/ThirdLevel" }
			}
		}
		`,
    references: [
      {
        name: 'https://example.com/schemas/ThirdLevel',
        subject: 'JSON:ThirdLevel',
        version: undefined,
      },
    ],
  } as JsonConfluentSchema,

  FirstLevelSchema: {
    type: SchemaType.JSON,
    schema: `
		{
			"$id": "https://example.com/schemas/FirstLevel",
			"type": "object",
			"properties": {
				"id1": { "type": "number" },
				"level1a": { "$ref": "https://example.com/schemas/SecondLevelA" },
				"level1b": { "$ref": "https://example.com/schemas/SecondLevelB" }
			}
		}
		`,
    references: [
      {
        name: 'https://example.com/schemas/SecondLevelA',
        subject: 'JSON:SecondLevelA',
        version: undefined,
      },
      {
        name: 'https://example.com/schemas/SecondLevelB',
        subject: 'JSON:SecondLevelB',
        version: undefined,
      },
    ],
  } as JsonConfluentSchema,
}

function apiResponse(result) {
  return JSON.parse(result.responseData)
}

describe('SchemaRegistry', () => {
  let schemaRegistry: SchemaRegistry
  let registeredSchema: RegisteredSchema
  let api

  beforeEach(async () => {
    const options = {
      [SchemaType.JSON]: {
        allErrors: true,
        detailedErrorPaths: true,
      },
    }
    api = API(schemaRegistryAPIClientArgs)
    schemaRegistry = new SchemaRegistry(schemaRegistryArgs, options)
  })

  describe('when register', () => {
    describe('when no reference', () => {
      beforeEach(async () => {
        registeredSchema = await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'JSON:ThirdLevel',
        })
      })
      it('should return schema id', async () => {
        expect(registeredSchema.id).toEqual(expect.any(Number))
      })

      it('should be able to encode/decode', async () => {
        const obj = { id3: 3 }

        const buffer = await schemaRegistry.encode(registeredSchema.id, obj)
        const resultObj = await schemaRegistry.decode(buffer)

        expect(resultObj).toEqual(obj)
      })
    })

    describe('with reference', () => {
      let schemaId
      let referenceSchema

      beforeEach(async () => {
        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'JSON:ThirdLevel',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'JSON:SecondLevelA',
        })
        schemaId = registeredSchema.id

        const schemaRaw = apiResponse(await api.Schema.find({ id: schemaId }))
        referenceSchema = schemaRaw.references[0].subject
      })

      it('should return schema id', async () => {
        expect(schemaId).toEqual(expect.any(Number))
      })

      it('should create a schema with reference', async () => {
        expect(referenceSchema).toEqual('JSON:ThirdLevel')
      })

      it('should be able to encode/decode', async () => {
        const obj = { id2a: 2, level2a: { id3: 3 } }

        const buffer = await schemaRegistry.encode(registeredSchema.id, obj)
        const resultObj = await schemaRegistry.decode(buffer)

        expect(resultObj).toEqual(obj)
      })

      it('should return error message', async () => {
        const obj = { id2a: 'sdfsdfsdf', level2a: 1 }
        try {
          await schemaRegistry.encode(registeredSchema.id, obj)
        } catch (ex) {
          expect(ex.paths[0].message).toBeDefined()
          expect(ex.paths[0].message).toEqual('must be number')
        }
      })
    })

    describe('with multiple reference', () => {
      beforeEach(async () => {
        let latest

        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'JSON:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'JSON:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'JSON:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'JSON:FirstLevel',
        })
      })

      it('should be able to encode/decode', async () => {
        const obj = {
          id1: 1,
          level1a: { id2a: 2, level2a: { id3: 3 } },
          level1b: { id2b: 4, level2b: { id3: 5 } },
        }

        const buffer = await schemaRegistry.encode(registeredSchema.id, obj)
        const resultObj = await schemaRegistry.decode(buffer)

        expect(resultObj).toEqual(obj)
      })

      it('should be able to encode/decode independent', async () => {
        const obj = {
          id1: 1,
          level1a: { id2a: 2, level2a: { id3: 3 } },
          level1b: { id2b: 4, level2b: { id3: 5 } },
        }

        schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
        const buffer = await schemaRegistry.encode(registeredSchema.id, obj)

        schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
        const resultObj = await schemaRegistry.decode(buffer)

        expect(resultObj).toEqual(obj)
      })
    })
  })

  describe('_getSchema', () => {
    let schema

    describe('no references', () => {
      beforeEach(async () => {
        registeredSchema = await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'JSON:ThirdLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should be able to encode/decode', async () => {
        const obj = { id3: 3 }

        const buffer = await schema.toBuffer(obj)
        const resultObj = await schema.fromBuffer(buffer)

        expect(resultObj).toEqual(obj)
      })
    })

    describe('with references', () => {
      beforeEach(async () => {
        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, { subject: 'JSON:ThirdLevel' })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'JSON:SecondLevelA',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should be able to encode/decode', async () => {
        const obj = { id2a: 2, level2a: { id3: 3 } }

        const buffer = await schema.toBuffer(obj)
        const resultObj = await schema.fromBuffer(buffer)

        expect(resultObj).toEqual(obj)
      })
    })

    describe('with multi references', () => {
      beforeEach(async () => {
        let latest

        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'JSON:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'JSON:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'JSON:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'JSON:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'JSON:FirstLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should be able to encode/decode', async () => {
        const obj = {
          id1: 1,
          level1a: { id2a: 2, level2a: { id3: 3 } },
          level1b: { id2b: 4, level2b: { id3: 5 } },
        }

        const buffer = await schema.toBuffer(obj)
        const resultObj = await schema.fromBuffer(buffer)

        expect(resultObj).toEqual(obj)
      })
    })
  })

  describe('when document example', () => {
    it('should encode/decode', async () => {
      const schemaA = {
        $id: 'https://example.com/schemas/A',
        type: 'object',
        properties: {
          id: { type: 'number' },
          b: { $ref: 'https://example.com/schemas/B' },
        },
      }

      const schemaB = {
        $id: 'https://example.com/schemas/B',
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
      }

      await schemaRegistry.register(
        { type: SchemaType.JSON, schema: JSON.stringify(schemaB) },
        { subject: 'JSON:B' },
      )

      const response = await schemaRegistry.api.Subject.latestVersion({ subject: 'JSON:B' })
      const { version } = JSON.parse(response.responseData)

      const { id } = await schemaRegistry.register(
        {
          type: SchemaType.JSON,
          schema: JSON.stringify(schemaA),
          references: [
            {
              name: 'https://example.com/schemas/B',
              subject: 'JSON:B',
              version,
            },
          ],
        },
        { subject: 'JSON:A' },
      )

      const obj = { id: 1, b: { id: 2 } }

      const buffer = await schemaRegistry.encode(id, obj)
      const decodedObj = await schemaRegistry.decode(buffer)

      expect(decodedObj).toEqual(obj)
    })
  })
})
