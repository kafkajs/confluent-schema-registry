---
id: advanced-usage
title: Advanced Usage
sidebar_label: Advanced Usage
---

While typical usage is covered in [Usage](./usage), Confluent Schema Registry also
provides functionality for more advanced usage.

## Get latest schema id by subject

```js
const subject = 'com.example.Simple'
const id = await registry.getLatestSchemaId(subject)
```

## Get schema id by subject and version

```js
const subject = 'com.example.Simple'
const version = 1

const id = await registry.getRegistryId(subject, version)
```

> _Note:_ Currently there is no way to list versions by subject.

## Get schema id by schema

Returns the schema id if the schema has already been registered for the provided
subject.

If a matching schema does not exist for the subject, it throws a
`ConfluentSchemaRegistryError`

```js
const subject = 'com.example.Simple'
const schema = await avdlToAVSCAsync('path/to/protocol.avdl')

const id = await registry.getRegistryIdBySchema(subject, {
  type: SchemaType.AVRO,
  schema: JSON.stringify(schema),
})
```

## Getting schema by schema id

Normally Confluent Schema Registry keeps the schemas internally and don't require
the user to handle them to encode/decode data, but if you need to get a schema
from the registry, you can do so by its schema id:

```js
// See https://github.com/kafkajs/confluent-schema-registry/blob/master/src/%40types.ts#L30-L46
// for a complete return type
const schema = await registry.getSchema(id)
```

## Using custom middlewares

The Schema Registry Client now supports adding custom mappersmith middlewares, providing flexibility to handle various use cases such as OAuth authentication or other custom request/response transformations.

To use custom middlewares, include them when initializing the Schema Registry Client:

```ts
import { Middleware } from 'mappersmith'

const customMiddleware: Middleware = jest.fn(() => {
  return {
    async request(request) {
      return request.enhance({
        headers: {
          Authorization: 'Bearer Random',
        },
      })
    },
    async response(next) {
      return next()
    },
  }
})

const registry = new SchemaRegistry({
  host: 'your_host',
  middlewares: [customMiddleware],
})
```
