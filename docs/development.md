---
id: development
title: Development
sidebar_label: Development
---

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

### Publishing a new version

- Create a new branch
- Update `CHANGELOG.md` with all the relevant changes since the last release by [comparing commits](https://github.com/kafkajs/confluent-schema-registry/compare/v1.0.5...master) since last release
- Bump the `package.json` version and create a corresponding tag using `npm version <major | minor | patch>`
- Push changes to your branch
- Create PR, wait for successful builds
- Merge PR
- Push tags `git push --tags`, this will trigger a CI job which publishes the new version on `npm`.
