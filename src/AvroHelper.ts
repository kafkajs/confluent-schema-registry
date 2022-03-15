import {
  AvroSchema,
  RawAvroSchema,
  AvroOptions,
  ConfluentSchema,
  SchemaHelper,
  ConfluentSubject,
  ReferenceType,
  AvroConfluentSchema,
  ProtocolOptions,
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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this
    const avroSchema = avro.Type.forSchema(rawSchema, {
      ...opts,
      // @ts-ignore
      typeHook:
        opts?.typeHook ||
        function(_schema: avro.Schema, opts: ForSchemaOptions) {
          const avroOpts = opts as AvroOptions
          avroOpts?.referredSchemas?.forEach(subSchema => {
            const confluentSchema = {
              schema: subSchema,
              type: SchemaType.AVRO,
            } as ConfluentSchema
            const rawSubSchema = me.getRawAvroSchema(confluentSchema)
            avroOpts.typeHook = undefined
            avro.Type.forSchema(rawSubSchema, avroOpts)
          })
        },
    })

    return avroSchema
  }

  public validate(avroSchema: AvroSchema): void {
    if (!avroSchema.name) {
      throw new ConfluentSchemaRegistryArgumentError(`Invalid name: ${avroSchema.name}`)
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

  public toConfluentSchema(data: SchemaResponse): ConfluentSchema {
    return { type: SchemaType.AVRO, schema: data.schema, references: data.references }
  }

  updateOptionsFromSchemaReferences(
    options: ProtocolOptions,
    referredSchemas: (string | RawAvroSchema)[],
  ): ProtocolOptions {
    const opts = options ?? {}
    return { ...opts, [SchemaType.AVRO]: { ...opts[SchemaType.AVRO], referredSchemas } }
  }
}
