# confluent-schema-registry

`confluent-schema-registry` is a library that makes it easier to interact with the Confluent schema registry, it provides convenient methods to encode, decode and register new schemas using the Apache Avro serialization format and Confluent's [wire format](https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format).

[![Build Status](https://dev.azure.com/tulios/ConfluentSchemaRegistry/_apis/build/status/kafkajs.confluent-schema-registry?branchName=master)](https://dev.azure.com/tulios/ConfluentSchemaRegistry/_build/latest?definitionId=3&branchName=master)

- [Install](#install)
- [Usage](#usage)
  - [Creating the registry client](#creating-the-registry-client)
  - [Retry](#retry)
  - [Uploading schemas](#uploading-schemas)
  - [Encoding data](#encoding-data)
  - [Decoding data](#decoding-data)
- [Development](#development)
  - [Glossary](#glossary)
  - [References](#references)

## Install

```sh
yarn add confluent-schema-registry
```

## Usage

##### Creating the registry client

```JavaScript
const { SchemaRegistry } = require("confluent-schema-registry");
const registry = new SchemaRegistry({ host: "http://localhost:2181" });
```

##### Retry

By default, all GET requests will retry three times in case of failure. If you want to tweak this config you can do:

```JavaScript
const registry = new SchemaRegistry({
  host: "http://localhost:2181",
  retry: {
    maxRetryTimeInSecs: 5,
    initialRetryTimeInSecs: 0.1,
    factor: 0.2, // randomization factor
    multiplier: 2, // exponential factor
    retries: 3 // max retries
  }
});
```

##### Uploading schemas

```JavaScript
const { utils } = require("confluent-schema-registry");

// From a avsc file
await registry.register(utils.readAVSC("path/to/schema.avsc")); // { id: 2 }

// From a avdl file
await registry.register(utils.avdlToAVSC("path/to/protocol.avdl")); // { id: 3 }
```

The compatibility of the schema will be whatever the global default is (typically `BACKWARD`).
It's possible to override this for the specific subject by setting it like so:

```JavaScript
const {
  compatibility: { NONE }
} = require("confluent-schema-registry");
await registry.register(Schema, { compatibility: NONE }); // { id: 4 }
```

**NOTE:**
If the subject already has an overridden compatibility setting and it's different,
the client will throw and error (`ConfluentSchemaRegistryCompatibilityError`)

##### Encoding data

```JavaScript
const payload = { full_name: "John Doe" };
await registry.encode(300, payload, { separator: "-" });
// The Default `separator` is `.` (dot).
```

##### Decoding data

```JavaScript
const payload = await registry.decode(buffer);
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

##### Glossary

This glossary shall help you when reading the code and understanding Schema Registry at large.

| Term       | Description                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| subject    | The full name to be used to group a schema history. Consists of a namespace and a name.           |
| namespace  | The initial part of a subject. e.g. domain.your-project.some-feature                              |
| name       | The final part of a subject. e.g. User                                                            |
| version    | The object containing id and the schema. Its own id is _not_ global, but unique for each subject. |
| registryId | The global id of a schema version. Retrieved by `register`.                                       |

##### References

- [Confluent wire format](https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format)
- [Java version](https://github.com/confluentinc/schema-registry/tree/master/avro-serializer/src/main/java/io/confluent/kafka/serializers)
- [Compatibility and schema evolution](https://docs.confluent.io/current/avro.html)
