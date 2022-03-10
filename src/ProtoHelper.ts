import {
  Schema,
  SchemaHelper,
  ConfluentSubject,
  ConfluentSchema,
  SchemaResponse,
  SchemaType,
  ReferenceType,
  ProtoConfluentSchema,
  ProtocolOptions,
} from './@types'
import { ConfluentSchemaRegistryError } from './errors'

export default class ProtoHelper implements SchemaHelper {
  public validate(_schema: Schema): void {
    return
  }

  public getSubject(
    _confluentSchema: ConfluentSchema,
    _schema: Schema,
    _separator: string,
  ): ConfluentSubject {
    throw new ConfluentSchemaRegistryError('not implemented yet')
  }

  public toConfluentSchema(data: SchemaResponse): ConfluentSchema {
    return { type: SchemaType.PROTOBUF, schema: data.schema, references: data.references }
  }

  getReferences(schema: ProtoConfluentSchema): ReferenceType[] | undefined {
    return schema.references
  }

  updateOptions(options: ProtocolOptions, referredSchemas: string[]): ProtocolOptions {
    const result = { ...options }
    return { ...result, [SchemaType.PROTOBUF]: { ...result[SchemaType.PROTOBUF], referredSchemas } }
  }
}
