import SchemaRegistry, { RegisteredSchema } from './SchemaRegistry'
import API from './api'
import { ProtoConfluentSchema, SchemaType } from './@types'

const REGISTRY_HOST = 'http://localhost:8982'
const schemaRegistryAPIClientArgs = { host: REGISTRY_HOST }
const schemaRegistryArgs = { host: REGISTRY_HOST }

const TestSchemas = {
  FirstLevelSchema: {
    type: SchemaType.PROTOBUF,
    schema: `
	syntax = "proto3";
	package test;
	import "test/second_level_A.proto";
	import "test/second_level_B.proto";

	message FirstLevel {
		int32 id1 = 1;
		SecondLevelA level1a = 2;
		SecondLevelB level1b = 3;
	}`,
    references: [
      {
        name: 'test/second_level_A.proto',
        subject: 'Proto:SecondLevelA',
        version: undefined,
      },
      {
        name: 'test/second_level_B.proto',
        subject: 'Proto:SecondLevelB',
        version: undefined,
      },
    ],
  } as ProtoConfluentSchema,

  SecondLevelASchema: {
    type: SchemaType.PROTOBUF,
    schema: `
	  syntax = "proto3";
	  package test;
	  import "test/third_level.proto";

	  message SecondLevelA {
		int32 id2a = 1;
		ThirdLevel level2a = 2;
	  }`,
    references: [
      {
        name: 'test/third_level.proto',
        subject: 'Proto:ThirdLevel',
        version: undefined,
      },
    ],
  } as ProtoConfluentSchema,

  SecondLevelBSchema: {
    type: SchemaType.PROTOBUF,
    schema: `
	  syntax = "proto3";
	  package test;
	  import "test/third_level.proto";

	  message SecondLevelB {
		int32 id2b = 1;
		ThirdLevel level2b = 2;
	  }`,
    references: [
      {
        name: 'test/third_level.proto',
        subject: 'Proto:ThirdLevel',
        version: undefined,
      },
    ],
  } as ProtoConfluentSchema,

  ThirdLevelSchema: {
    type: SchemaType.PROTOBUF,
    schema: `
		syntax = "proto3";
		package test;

		message ThirdLevel {
			int32 id3 = 1;
		}`,
  } as ProtoConfluentSchema,
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
          subject: 'Proto:ThirdLevel',
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
          subject: 'Proto:ThirdLevel',
        })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Proto:SecondLevelA',
        })
        schemaId = registeredSchema.id

        const schemaRaw = apiResponse(await api.Schema.find({ id: schemaId }))
        referenceSchema = schemaRaw.references[0].subject
      })

      it('should return schema id', async () => {
        expect(schemaId).toEqual(expect.any(Number))
      })
      it('should create a schema with reference', async () => {
        expect(referenceSchema).toEqual('Proto:ThirdLevel')
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

        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, {
          subject: 'Proto:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Proto:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'Proto:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'Proto:FirstLevel',
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
          subject: 'Proto:ThirdLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match message', async () => {
        expect(schema.message.name).toEqual('ThirdLevel')
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
        await schemaRegistry.register(TestSchemas.ThirdLevelSchema, { subject: 'Proto:ThirdLevel' })

        const latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Proto:SecondLevelA',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match message', async () => {
        expect(schema.message.name).toEqual('SecondLevelA')
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
          subject: 'Proto:ThirdLevel',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelASchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelASchema, {
          subject: 'Proto:SecondLevelA',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:ThirdLevel' }))
        TestSchemas.SecondLevelBSchema.references[0].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.SecondLevelBSchema, {
          subject: 'Proto:SecondLevelB',
        })

        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:SecondLevelA' }))
        TestSchemas.FirstLevelSchema.references[0].version = latest.version
        latest = apiResponse(await api.Subject.latestVersion({ subject: 'Proto:SecondLevelB' }))
        TestSchemas.FirstLevelSchema.references[1].version = latest.version
        registeredSchema = await schemaRegistry.register(TestSchemas.FirstLevelSchema, {
          subject: 'Proto:FirstLevel',
        })
        ;({ schema } = await schemaRegistry['_getSchema'](registeredSchema.id))
      })

      it('should return schema that match message', async () => {
        expect(schema.message.name).toEqual('FirstLevel')
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
      const schemaA = `
		syntax = "proto3";
		package test;
		import "test/B.proto";

		message A {
			int32 id = 1;
			B b = 2;
		}`

      const schemaB = `
		syntax = "proto3";
		package test;

		message B {
			int32 id = 1;
		}`

      await schemaRegistry.register(
        { type: SchemaType.PROTOBUF, schema: schemaB },
        { subject: 'Proto:B' },
      )

      const response = await schemaRegistry.api.Subject.latestVersion({ subject: 'Proto:B' })
      const { version } = JSON.parse(response.responseData)

      const { id } = await schemaRegistry.register(
        {
          type: SchemaType.PROTOBUF,
          schema: schemaA,
          references: [
            {
              name: 'test/B.proto',
              subject: 'Proto:B',
              version,
            },
          ],
        },
        { subject: 'Proto:A' },
      )

      const obj = { id: 1, b: { id: 2 } }

      const buffer = await schemaRegistry.encode(id, obj)
      const decodedObj = await schemaRegistry.decode(buffer)

      expect(decodedObj).toEqual(obj)
    })
  })
})
