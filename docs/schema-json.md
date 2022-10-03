---
id: schema-json
title: Example JSON Schemas
sidebar_label: Example JSON Schemas
---

## Schema with references to other schemas

You might want to split the JSON definition into several schemas one for each type.

```JSON
{
	"$id": "https://example.com/schemas/A",
	"type": "object",
	"properties": {
		"id": { "type": "number" },
		"b": { "$ref": "https://example.com/schemas/B" }
	}
}
```

```JSON
{
	"$id": "https://example.com/schemas/B",
	"type": "object",
	"properties": {
		"id": { "type": "number" }
	}
}
```

To register schemas with references, the schemas have to be registered in reverse order. The schema that references another schema has to be registered after the schema it references. In this example B has to be registered before A. Furthermore, when registering A, a list of references have to be provided. A reference consist of:

 * `name` - A URL matching the `$ref` from the schema
 * `subject` - the subject the schema is registered under in the registry
 * `version` - the version of the schema you want to use

The library will handle an arbitrary number of nested levels.

```js
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
```
