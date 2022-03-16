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
    options: ProtocolOptions,
    referredSchemas: JsonConfluentSchema[],
  ): ProtocolOptions {
    const opts = options ?? {}
    return { ...opts, [SchemaType.JSON]: { ...opts[SchemaType.JSON], referredSchemas } }
  }
}
