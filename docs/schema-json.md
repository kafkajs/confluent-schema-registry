---
id: schema-json
title: Example JSON Schemas
sidebar_label: Example JSON Schemas
---

## Schema with references to other schemas

You might want to split the JSON definition into several schemas one for each type.

```JSON
{
	"$id": "https://sumup.com/schemas/A",
	"type": "object",
	"properties": {
		"id": { "type": "number" },
		"b": { "$ref": "https://sumup.com/schemas/B" }
	}
}
```

```JSON
{
	"$id": "https://sumup.com/schemas/B",
	"type": "object",
	"properties": {
		"id": { "type": "number" }
	}
}
```

To registry schemas with references they have to be registered in reverse order, so the referred schemas already exists. In this case B has to be registered before A. Furthermore A must define an array references to the referred schemas. A reference consist of a `name`, that should match the $ref, a schema `subject` and a schema `version`.

Notice the library will handle an arbitrary number of nested levels.

```js
const schemaA = `
{
	"$id": "https://sumup.com/schemas/A",
	"type": "object",
	"properties": {
		"id": { "type": "number" },
		"b": { "$ref": "https://sumup.com/schemas/B" }
	}
}`

const schemaB = `
{
	"$id": "https://sumup.com/schemas/B",
	"type": "object",
	"properties": {
		"id": { "type": "number" }
	}
}`

await schemaRegistry.register(
	{ type: SchemaType.JSON, schema: schemaB },
	{ subject: 'B'})

const { version } = apiResponse(await api.Subject.latestVersion({ subject: 'B' }))

const { id } = await schemaRegistry.register(
	{ type: SchemaType.JSON, schema: schemaA, references: [
      {
        name: 'https://sumup.com/schemas/B',
        subject: 'B',
        version,
      },
    ]},
	{ subject: 'A' })

const obj = { id: 1, b: { id: 2 } }

const buffer = await schemaRegistry.encode(id, obj)
const decodedObj = await schemaRegistry.decode(buffer)
```
