import avro from 'avsc'
import {
  AvroOptions,
  AvroSchema,
  ConfluentSchema,
  ConfluentSubject,
  RawAvroSchema,
  SchemaHelper,
} from './@types'
import { ConfluentSchemaRegistryInvalidSchemaError } from './errors'

export default class AvroHelper implements SchemaHelper {
  private getRawAvroSchema(schema: ConfluentSchema): RawAvroSchema {
    return (typeof schema.schema === 'string'
      ? JSON.parse(schema.schema)
      : schema.schema) as RawAvroSchema
  }

  public getAvroSchema(schema: ConfluentSchema | RawAvroSchema, opts?: AvroOptions) {
    const rawSchema: RawAvroSchema = this.isRawAvroSchema(schema)
      ? schema
      : this.getRawAvroSchema(schema)
    // @ts-ignore TODO: Fix typings for Schema...
    const avroSchema: AvroSchema = avro.Type.forSchema(rawSchema, opts)
    return avroSchema
  }

  public validate(avroSchema: AvroSchema): void {
    if (!avroSchema.name) {
      throw new ConfluentSchemaRegistryInvalidSchemaError(
        `Schema validation failed: Invalid schema name: ${avroSchema.name}`,
      )
    }
  }

  public getSubject(
    schema: ConfluentSchema,
    // @ts-ignore
    avroSchema: AvroSchema,
    separator: string,
  ): ConfluentSubject {
    const rawSchema: RawAvroSchema = this.getRawAvroSchema(schema)

    if (!rawSchema.namespace) {
      throw new ConfluentSchemaRegistryInvalidSchemaError(
        `Schema validation failed: Invalid schema namespace: ${rawSchema.namespace}`,
      )
    }

    const subject: ConfluentSubject = {
      name: [rawSchema.namespace, rawSchema.name].join(separator),
    }
    return subject
  }

  private isRawAvroSchema(schema: ConfluentSchema | RawAvroSchema): schema is RawAvroSchema {
    const asRawAvroSchema = schema as RawAvroSchema
    return asRawAvroSchema.name != null && asRawAvroSchema.type != null
  }
}
