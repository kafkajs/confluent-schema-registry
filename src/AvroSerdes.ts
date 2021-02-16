import { AvroSchema, ConfluentSchema, Serdes, ConfluentSubject } from './@types'
import { ConfluentSchemaRegistryArgumentError } from './errors'
import avro from 'avsc'

export default class AvroSerdes implements Serdes {
  private getAvroSchema(schema: ConfluentSchema, opts?: any) {
    // @ts-ignore TODO: Fix typings for Schema...
    const avroSchema: AvroSchema = avro.Type.forSchema(JSON.parse(schema.schemaString), opts)
    return avroSchema
  }

  public validate(schema: ConfluentSchema): void {
    const avroSchema: AvroSchema = this.getAvroSchema(schema)
    if (!avroSchema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${avroSchema.name}`)
    }
  }

  public getSubject(schema: ConfluentSchema, separator: string): ConfluentSubject {
    const avroSchema: AvroSchema = this.getAvroSchema(schema)
    if (!avroSchema.namespace) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${avroSchema.namespace}`)
    }

    const subject: ConfluentSubject = {
      name: [avroSchema.namespace, avroSchema.name].join(separator),
    }
    return subject
  }

  public serialize(schema: ConfluentSchema, payload: any, opts: any): Buffer {
    return this.getAvroSchema(schema, opts).toBuffer(payload)
  }

  public deserialize(schema: ConfluentSchema, buffer: Buffer, opts: any): any {
    return this.getAvroSchema(schema, opts).fromBuffer(buffer)
  }
}
