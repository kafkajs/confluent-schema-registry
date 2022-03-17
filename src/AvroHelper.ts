import {
  AvroSchema,
  RawAvroSchema,
  AvroOptions,
  ConfluentSchema,
  SchemaHelper,
  ConfluentSubject,
  ProtocolOptions,
  AvroConfluentSchema,
} from './@types'
import { ConfluentSchemaRegistryArgumentError } from './errors'
import avro, { ForSchemaOptions } from 'avsc'
import { SchemaResponse, SchemaType } from './@types'

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

    const typeHook = (_schema: avro.Schema, opts: ForSchemaOptions) => {
      const avroOpts = opts as AvroOptions
      avroOpts?.referredSchemas?.forEach(subSchema => {
        const rawSubSchema = this.getRawAvroSchema(subSchema)
        avroOpts.typeHook = undefined
        avro.Type.forSchema(rawSubSchema, avroOpts)
      })
    }
    const avroSchema = avro.Type.forSchema(rawSchema, {
      ...opts,
      // @ts-ignore
      typeHook: opts?.typeHook || typeHook,
    })

    return avroSchema
  }

  public validate(avroSchema: AvroSchema): void {
    if (!avroSchema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${avroSchema.name}`)
    }
  }

  public getSubject(
    schema: AvroConfluentSchema,
    // @ts-ignore
    avroSchema: AvroSchema,
    separator: string,
  ): ConfluentSubject {
    const rawSchema: RawAvroSchema = this.getRawAvroSchema(schema)

    if (!rawSchema.namespace) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${rawSchema.namespace}`)
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

  public toConfluentSchema(data: SchemaResponse): AvroConfluentSchema {
    return { type: SchemaType.AVRO, schema: data.schema, references: data.references }
  }

  updateOptionsFromSchemaReferences(
    options: ProtocolOptions,
    referredSchemas: AvroConfluentSchema[],
  ): ProtocolOptions {
    const opts = options ?? {}
    return { ...opts, [SchemaType.AVRO]: { ...opts[SchemaType.AVRO], referredSchemas } }
  }
}
