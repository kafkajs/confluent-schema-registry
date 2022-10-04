import {
  Schema,
  SchemaHelper,
  ConfluentSubject,
  SchemaResponse,
  SchemaType,
  ProtocolOptions,
  JsonConfluentSchema,
} from './@types'
import { ConfluentSchemaRegistryError } from './errors'

export default class JsonHelper implements SchemaHelper {
  public validate(_schema: Schema): void {
    return
  }

  public getSubject(
    _confluentSchema: JsonConfluentSchema,
    _schema: Schema,
    _separator: string,
  ): ConfluentSubject {
    throw new ConfluentSchemaRegistryError('not implemented yet')
  }

  public toConfluentSchema(data: SchemaResponse): JsonConfluentSchema {
    return { type: SchemaType.JSON, schema: data.schema, references: data.references }
  }

  updateOptionsFromSchemaReferences(
    referencedSchemas: JsonConfluentSchema[],
    options: ProtocolOptions = {},
  ): ProtocolOptions {
    return { ...options, [SchemaType.JSON]: { ...options[SchemaType.JSON], referencedSchemas } }
  }
}
