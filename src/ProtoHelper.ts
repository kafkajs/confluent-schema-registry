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

  updateOptionsFromSchemaReferences(
    options: ProtocolOptions,
    referredSchemas: string[],
  ): ProtocolOptions {
    const opt = { ...options }
    return { ...opt, [SchemaType.PROTOBUF]: { ...opt[SchemaType.PROTOBUF], referredSchemas } }
  }
}
