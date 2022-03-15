---
id: schema-avro
title: Example Avro Schemas
sidebar_label: Example Avro Schemas
---

## Schema with references to other schemas

You might want to split the Avro definition into several schemas one for each type.

```json
{
	"type" : "record",
	"namespace" : "test",
	"name" : "A",
	"fields" : [
	{ "name" : "id" , "type" : "int" },
	{ "name" : "b" , "type" : "test.B" }
	]
}
```

```json
{
	"type" : "record",
	"namespace" : "test",
	"name" : "B",
	"fields" : [
	{ "name" : "id" , "type" : "int" }
	]
}
```

To registry schemas with references they have to be registered in reverse order, so the referred schemas already exists. In this case B has to be registered before A. Furthermore A must define an array references to the referred schemas. A reference consist of a `name`, that should match the namespace + name, a schema `subject` and a schema `version`.

Notice the library will handle an arbitrary number of nested levels.

```js
const schemaA = `
{
	"type" : "record",
	"namespace" : "test",
	"name" : "A",
	"fields" : [
	{ "name" : "id" , "type" : "int" },
	{ "name" : "b" , "type" : "test.B" }
	]
}`

const schemaB = `
{
	"type" : "record",
	"namespace" : "test",
	"name" : "B",
	"fields" : [
	{ "name" : "id" , "type" : "int" }
	]
}`

await schemaRegistry.register(
{ type: SchemaType.AVRO, schema: schemaB },
{ subject: 'B' },
)

const { version } = apiResponse(await api.Subject.latestVersion({ subject: 'B' }))

const { id } = await schemaRegistry.register(
{
	type: SchemaType.AVRO,
	schema: schemaA,
	references: [
	{
		name: 'test.B',
		subject: 'B',
		version,
	},
	],
},
{ subject: 'A' },
)

const obj = { id: 1, b: { id: 2 } }

const buffer = await schemaRegistry.encode(id, obj)
const decodedObj = await schemaRegistry.decode(buffer)
```
