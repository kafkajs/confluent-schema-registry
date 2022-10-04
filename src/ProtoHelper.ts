import {
  Schema,
  SchemaHelper,
  ConfluentSubject,
  SchemaResponse,
  SchemaType,
  ProtocolOptions,
  ProtoConfluentSchema,
} from './@types'
import { ConfluentSchemaRegistryError } from './errors'

export default class ProtoHelper implements SchemaHelper {
  public validate(_schema: Schema): void {
    return
  }

  public getSubject(
    _confluentSchema: ProtoConfluentSchema,
    _schema: Schema,
    _separator: string,
  ): ConfluentSubject {
    throw new ConfluentSchemaRegistryError('not implemented yet')
  }

  public toConfluentSchema(data: SchemaResponse): ProtoConfluentSchema {
    return { type: SchemaType.PROTOBUF, schema: data.schema, references: data.references }
  }

  updateOptionsFromSchemaReferences(
    referencedSchemas: ProtoConfluentSchema[],
    options: ProtocolOptions = {},
  ): ProtocolOptions {
    return {
      ...options,
      [SchemaType.PROTOBUF]: { ...options[SchemaType.PROTOBUF], referencedSchemas },
    }
  }
}
