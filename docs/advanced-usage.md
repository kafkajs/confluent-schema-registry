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

> *Note:* Currently there is no way to list versions by subject.

## Getting schema by schema id

Normally Confluent Schema Registry keeps the schemas internally and don't require
the user to handle them to encode/decode data, but if you need to get a schema
from the registry, you can do so by its schema id:

```js
// See https://github.com/kafkajs/confluent-schema-registry/blob/master/src/%40types.ts#L1-L7
// for a complete return type
const schema = await registry.getSchema(id)
```