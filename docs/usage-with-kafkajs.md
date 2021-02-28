---
id: usage-with-kafkajs
title: Usage with KafkaJS
sidebar_label: Usage with KafkaJS
---

Although Confluent Schema Registry can be used with any Kafka client, or outside
of Kafka entirely, it is commonly used together with [KafkaJS](https://kafka.js.org).

The following is an example of an application that consumes from a topic of
AVRO encoded messages and produces to another topic after encoding the messages
with a different schema.


```js
const path = require('path')
const { Kafka } = require('kafkajs')
const { SchemaRegistry, SchemaType, avdlToAVSCAsync } = require('@kafkajs/confluent-schema-registry')

const registry = new SchemaRegistry({ host: 'http://localhost:8081' })
const kafka = new Kafka({
  brokers: ['localhost:9092'],
  clientId: 'example-consumer',
})
const consumer = kafka.consumer({ groupId: 'test-group' })
const producer = kafka.producer()

const incomingTopic = 'incoming'
const outgoingTopic = 'outgoing'

const run = async () => {
  const schema = await avdlToAVSCAsync(path.join(__dirname, 'schema.avdl'))
  const { id } = await registry.register({ type: SchemaType.AVRO, schema: JSON.stringify(schema) })

  await consumer.connect()
  await producer.connect()

  await consumer.subscribe({ topic: incomingTopic })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const decodedMessage = {
        ...message,
        value: await registry.decode(message.value)
      }

      const outgoingMessage = {
        key: message.key,
        value: await registry.encode(id, decodedMessage.value)
      }

      await producer.send({
        topic: outgoingTopic,
        messages: [ outgoingMessage ]
      })
    },
  })
}

run().catch(async e => {
  console.error(e)
  consumer && await consumer.disconnect()
  producer && await producer.disconnect()
  process.exit(1)
})
```

Note that this example is only intended as a simple visualization of how
to use Confluent Schema Registry together with KafkaJS. It is not necessarily
intended to be a production-ready application.
