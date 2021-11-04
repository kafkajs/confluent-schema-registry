---
id: introduction
title: Introduction
sidebar_label: Introduction
---

`confluent-schema-registry` is a library that makes it easier to interact with the Confluent schema registry, it provides convenient methods to encode, decode and register new schemas using the Apache Avro, JSON Schema and Protobuf serialization formats and Confluent's [wire format](https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format).

## Install

```sh
npm install @kafkajs/confluent-schema-registry
# yarn add @kafkajs/confluent-schema-registry
```

## Example

This example uses an AVRO schema. For more detailed explanations and examples of other schema types, [see usage](./usage.md).

```js
const path = require('path')
const { SchemaRegistry, SchemaType } = require('@kafkajs/confluent-schema-registry')

const registry = new SchemaRegistry({ host: 'http://localhost:8081' })

// Upload a schema to the registry
const schema = `
  {
    "type": "record",
    "name": "RandomTest",
    "namespace": "examples",
    "fields": [{ "type": "string", "name": "fullName" }]
  }
`
const { id } = await registry.register({
    type: SchemaType.AVRO,
    schema
})

// Encode using the uploaded schema
const payload = { fullName: 'John Doe' }
const encodedPayload = await registry.encode(id, payload)

// Decode the payload
const decodedPayload = await registry.decode(encodedPayload)
```