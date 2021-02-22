import { AvroSchema, SchemaOptions, ConfluentSchema, Serdes, ConfluentSubject } from './@types'
import { ConfluentSchemaRegistryArgumentError } from './errors'
import avro from 'avsc'

export default class AvroSerdes implements Serdes {
  public getAvroSchema(schema: ConfluentSchema, opts?: SchemaOptions) {
    // @ts-ignore TODO: Fix typings for Schema...
    const avroSchema: AvroSchema = avro.Type.forSchema(JSON.parse(schema.schemaString), opts)
    return avroSchema
  }

  public validate(avroSchema: AvroSchema): void {
    if (!avroSchema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${avroSchema.name}`)
    }
  }

  public getSubject(avroSchema: AvroSchema, separator: string): ConfluentSubject {
    if (!avroSchema.namespace) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${avroSchema.namespace}`)
    }

    const subject: ConfluentSubject = {
      name: [avroSchema.namespace, avroSchema.name].join(separator),
    }
    return subject
  }
}
