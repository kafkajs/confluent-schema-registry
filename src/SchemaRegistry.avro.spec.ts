import SchemaRegistry, { RegisteredSchema } from './SchemaRegistry'
import API from './api'
import { AvroConfluentSchema, SchemaType } from './@types'
import avro from 'avsc'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

enum Color {
  RED = 1,
  GREEN = 2,
  BLUE = 3,
}

enum Direction {
  UP = 1,
  DOWN = 2,
}

const TestSchemas = {
  FirstLevelSchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "FirstLevel",
		"fields" : [
		   { "name" : "id1" , "type" : "int" },
		   { "name" : "level1a" , "type" : "test.SecondLevelA" },
		   { "name" : "level1b" , "type" : "test.SecondLevelB" }
		]
	 }`,
    references: [
      {
        name: 'test.SecondLevelA',
        subject: 'Avro:SecondLevelA',
        version: undefined,
      },
      {
        name: 'test.SecondLevelB',
        subject: 'Avro:SecondLevelB',
        version: undefined,
      },
    ],
  } as AvroConfluentSchema,

  SecondLevelASchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "SecondLevelA",
		"fields" : [
		   { "name" : "id2a" , "type" : "int" },
		   { "name" : "level2a" , "type" : "test.ThirdLevel" }
		]
	 }`,
    references: [
      {
        name: 'test.ThirdLevel',
        subject: 'Avro:ThirdLevel',
        version: undefined,
      },
    ],
  } as AvroConfluentSchema,

  SecondLevelBSchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "SecondLevelB",
		"fields" : [
		   { "name" : "id2b" , "type" : "int" },
		   { "name" : "level2b" , "type" : "test.ThirdLevel" }
		]
	 }`,
    references: [
      {
        name: 'test.ThirdLevel',
        subject: 'Avro:ThirdLevel',
        version: undefined,
      },
    ],
  } as AvroConfluentSchema,

  ThirdLevelSchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "ThirdLevel",
		"fields" : [
		   { "name" : "id3" , "type" : "int" }
		]
	 }`,
  } as AvroConfluentSchema,

  EnumSchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "EnumSchema",
		"fields" : [
			{
				"name": "color",
				"type": ["null", {
						"type": "enum",
						"name": "Color",
						"symbols": ["RED", "GREEN", "BLUE"]
					}
				]
			}
		]
	 }`,
  } as AvroConfluentSchema,

  EnumWithReferencesSchema: {
    type: SchemaType.AVRO,
    schema: `
	{
		"type" : "record",
		"namespace" : "test",
		"name" : "EnumWithReferences",
		"fields" : [
			{
				"name": "direction",
				"type": ["null", {
						"type": "enum",
						"name": "Direction",
						"symbols": ["UP", "DOWN"]
					}
				]
			},
			{ "name" : "attributes" , "type" : "test.EnumSchema" }
		]
	 }`,
    references: [
      {
        name: 'test.EnumSchema',
        subject: 'Avro:EnumSchema',
        version: undefined,
      },
    ],
  } as AvroConfluentSchema,
}

function apiResponse(result) {
  return JSON.parse(result.responseData)
}

describe('SchemaRegistry', () => {
  let schemaRegistry: SchemaRegistry
  let registeredSchema: RegisteredSchema
  let api

  beforeEach(async () => {
    api = API(schemaRegistryAPIClientArgs)
    schemaRegistry = new SchemaRegistry(schemaRegistryArgs)
  })

  describe('when register', () => {
    describe('when no reference', () => {
      beforeEach(async () => {
        registeredSchema = await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'Avro:ThirdLevel',
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
          subject: 'Avro:ThirdLevel',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Avro:SecondLevelA',
        })
        schemaId = registeredSchema.id

        const schemaRaw = apiResponse(await api.Schema.find({ id: schemaId }))
        referenceSchema = schemaRaw.references[0].subject
      })

      it('should return schema id', async () => {
        expect(schemaId).toEqual(expect.any(Number))
      })

      it('should create a schema with reference', async () => {
        expect(referenceSchema).toEqual('Avro:ThirdLevel')
      })

      it('should be able to encode/decode', async () => {
        const obj = { id2a: 2, level2a: { id3: 3 } }

        const buffer = await schemaRegistry.encode(registeredSchema.id, obj)
        const resultObj = await schemaRegistry.decode(buffer)

        expect(resultObj).toEqual(obj)
      })
    })

    describe('with multiple reference', () => {
      beforeEach(async () => {
        let latest

        registeredSchema = await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'Avro:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Avro:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'Avro:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'Avro:FirstLevel',
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
          subject: 'Avro:ThirdLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match name', async () => {
        expect(schema.name).toEqual('test.ThirdLevel')
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
        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, { subject: 'Avro:ThirdLevel' })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Avro:SecondLevelA',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match name', async () => {
        expect(schema.name).toEqual('test.SecondLevelA')
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
          subject: 'Avro:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Avro:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'Avro:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'Avro:FirstLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match name', async () => {
        expect(schema.name).toEqual('test.FirstLevel')
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
        type: 'record',
        namespace: 'test',
        name: 'A',
        fields: [
          { name: 'id', type: 'int' },
          { name: 'b', type: 'test.B' },
        ],
      }

      const schemaB = {
        type: 'record',
        namespace: 'test',
        name: 'B',
        fields: [{ name: 'id', type: 'int' }],
      }

      await schemaRegistry.register(
        { type: SchemaType.AVRO, schema: JSON.stringify(schemaB) },
        { subject: 'Avro:B' },
      )

      const response = await schemaRegistry.api.Subject.latestVersion({ subject: 'Avro:B' })
      const { version } = JSON.parse(response.responseData)

      const { id } = await schemaRegistry.register(
        {
          type: SchemaType.AVRO,
          schema: JSON.stringify(schemaA),
          references: [
            {
              name: 'test.B',
              subject: 'Avro:B',
              version,
            },
          ],
        },
        { subject: 'Avro:A' },
      )

      const obj = { id: 1, b: { id: 2 } }

      const buffer = await schemaRegistry.encode(id, obj)
      const decodedObj = await schemaRegistry.decode(buffer)

      expect(decodedObj).toEqual(obj)
    })
  })

  describe('with EnumType types and nested schemas', () => {
    /**
     * Hook which will decode/encode enums to/from integers.
     *
     * The default `EnumType` implementation represents enum values as strings
     * (consistent with the JSON representation). This hook can be used to provide
     * an alternate representation (which is for example compatible with TypeScript
     * enums).
     *
     * For simplicity, we don't do any bound checking here but we could by
     * implementing a "bounded long" logical type and returning that instead.
     *
     * https://gist.github.com/mtth/c0088c745de048c4e466#file-long-enum-js
     */
    function typeHook(attrs, opts) {
      if (attrs.type === 'enum') {
        return avro.parse('long', opts)
      }
    }

    let schema

    describe('with no enum typeHook defined', () => {
      beforeEach(async () => {
        const schemaRegistry = new SchemaRegistry(schemaRegistryArgs)

        await schemaRegistry.register(TestSchemas.EnumSchema, {
          subject: 'Avro:EnumSchema',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:EnumSchema' }))
        TestSchemas.EnumWithReferencesSchema.references[0].version = latest.version
        const registeredSchema = await schemaRegistry.register(
          TestSchemas.EnumWithReferencesSchema,
          {
            subject: 'Avro:EnumWithReferences',
          },
        )
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should not be able to encode/decode enums schemas', async () => {
        const obj = {
          direction: Direction.UP,
          attributes: { color: Color.BLUE },
        }

        expect(() => schema.toBuffer(obj)).toThrow(Error)
      })
    })

    describe('with enum typeHook defined', () => {
      beforeEach(async () => {
        const schemaRegistry = new SchemaRegistry(schemaRegistryArgs, {
          [SchemaType.AVRO]: { typeHook },
        })

        await schemaRegistry.register(TestSchemas.EnumSchema, {
          subject: 'Avro:EnumSchema',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:EnumSchema' }))
        TestSchemas.EnumWithReferencesSchema.references[0].version = latest.version
        const registeredSchema = await schemaRegistry.register(
          TestSchemas.EnumWithReferencesSchema,
          {
            subject: 'Avro:EnumWithReferences',
          },
        )
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should be able to encode/decode enums schemas', async () => {
        const obj = {
          direction: Direction.UP,
          attributes: { color: Color.BLUE },
        }

        const buffer = await schema.toBuffer(obj)
        const resultObj = await schema.fromBuffer(buffer)

        expect(resultObj).toEqual(obj)
      })
    })
    describe('with enum typeHook defined as LegacyOptions', () => {
      beforeEach(async () => {
        const schemaRegistry = new SchemaRegistry(schemaRegistryArgs, {
          forSchemaOptions: { typeHook },
        })

        await schemaRegistry.register(TestSchemas.EnumSchema, {
          subject: 'Avro:EnumSchema',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Avro:EnumSchema' }))
        TestSchemas.EnumWithReferencesSchema.references[0].version = latest.version
        const registeredSchema = await schemaRegistry.register(
          TestSchemas.EnumWithReferencesSchema,
          {
            subject: 'Avro:EnumWithReferences',
          },
        )
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should be able to encode/decode enums schemas', async () => {
        const obj = {
          direction: Direction.UP,
          attributes: { color: Color.BLUE },
        }

        const buffer = await schema.toBuffer(obj)
        const resultObj = await schema.fromBuffer(buffer)

        expect(resultObj).toEqual(obj)
      })
    })
  })
})
