---
id: schema-protobuf
title: Example Protobuf Schemas
sidebar_label: Example Protobuf Schemas
---

## Schema with references to other schemas

You might want to split the Protobuf definition into several schemas one for each type.

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

To registry schemas with references they have to be registered in reverse order, so the referred schemas already exists. In this case B has to be registered before A. Furthermore A must define an array references to the referred schemas. A reference consist of a `name`, that should match the import statement, a schema `subject` and a schema `version`.

Notice the library will handle an arbitrary number of nested levels.

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
