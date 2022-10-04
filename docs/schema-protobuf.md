---
id: schema-protobuf
title: Example Protobuf Schemas
sidebar_label: Example Protobuf Schemas
---

## Schema with references to other schemas

You might want to split the Protobuf definition into several schemas, one for each type.

```protobuf
syntax = "proto3";
package test;
import "test/B.proto";

message A {
	int32 id = 1;
	B b = 2;
}
```

```protobuf
syntax = "proto3";
package test;

message B {
	int32 id = 1;
}
```

To register schemas with references, the schemas have to be registered in reverse order. The schema that references another schema has to be registered after the schema it references. In this example B has to be registered before A. Furthermore, when registering A, a list of references have to be provided. A reference consist of:

 * `name` - String matching the import statement. For example: `test/B.proto`
 * `subject` - the subject the schema is registered under in the registry
 * `version` - the version of the schema you want to use

The library will handle an arbitrary number of nested levels.

```js
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
```
