---
id: introduction
title: Introduction
sidebar_label: Introduction
---

`confluent-schema-registry` is a library that makes it easier to interact with the Confluent schema registry, it provides convenient methods to encode, decode and register new schemas using the Apache Avro serialization format and Confluent's [wire format](https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format).

## Install

```sh
npm install @kafkajs/confluent-schema-registry
# yarn add @kafkajs/confluent-schema-registry
```

## Usage

### Creating the registry client

```js
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry')
const registry = new SchemaRegistry({ host: 'http://localhost:2181' })
```

### Retry

By default, all `GET` requests will retry three times in case of failure. If you want to tweak this config you can do:

```js
const registry = new SchemaRegistry({
  host: 'http://localhost:2181',
  retry: {
    maxRetryTimeInSecs: 5,
    initialRetryTimeInSecs: 0.1,
    factor: 0.2, // randomization factor
    multiplier: 2, // exponential factor
    retries: 3, // max retries
  },
})
```

### Uploading schemas

```js
const { readAVSC } = require('@kafkajs/confluent-schema-registry')

// From a avsc file
await registry.register(readAVSC('path/to/schema.avsc')) // { id: 2 }

// From a avdl file
await registry.register(avdlToAVSC('path/to/protocol.avdl')) // { id: 3 }
```

The [compatibility](https://docs.confluent.io/current/schema-registry/avro.html#compatibility-types) of the schema will be whatever the global default is (typically `BACKWARD`).
It's possible to override this for the specific subject by setting it like so:

```js
const {
  COMPATIBILITY: { NONE },
} = require('@kafkajs/confluent-schema-registry')
await registry.register(Schema, { compatibility: NONE }) // { id: 4 }
```

**NOTE:**
If the subject already has an overridden compatibility setting and it's different,
the client will throw and error (`ConfluentSchemaRegistryCompatibilityError`)

### Encoding data

```js
const payload = { full_name: 'John Doe' }
await registry.encode(300, payload, { separator: '-' })
// The Default `separator` is `.` (dot).
```

### Decoding data

```js
const payload = await registry.decode(buffer)
// { full_name: 'John Doe' }
```

## Development

To run the registry locally:

```sh
docker-compose up
```

To tail the logs:

```sh
# Replace CONTAINER_ID with the container's ID
docker exec -it CONTAINER_ID bash -c "supervisorctl tail -f schema-registry"
```

### Glossary

This glossary shall help you when reading the code and understanding Schema Registry at large.

| Term       | Description                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| subject    | The full name to be used to group a schema history. Consists of a namespace and a name.           |
| namespace  | The initial part of a subject. e.g. domain.your-project.some-feature                              |
| name       | The final part of a subject. e.g. User                                                            |
| version    | The object containing id and the schema. Its own id is _not_ global, but unique for each subject. |
| registryId | The global id of a schema version. Retrieved by `register`.                                       |

### References

- [Confluent wire format](https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format)
- [Java version](https://github.com/confluentinc/schema-registry/tree/master/avro-serializer/src/main/java/io/confluent/kafka/serializers)
- [Compatibility and schema evolution](https://docs.confluent.io/current/avro.html)
