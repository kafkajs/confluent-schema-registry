import {
  Schema,
  SchemaHelper,
  ConfluentSubject,
  ConfluentSchema,
  SchemaResponse,
  SchemaType,
  ReferenceType,
  JsonConfluentSchema,
  ProtocolOptions,
} from './@types'
import { ConfluentSchemaRegistryError } from './errors'

export default class JsonHelper implements SchemaHelper {
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
    return { type: SchemaType.JSON, schema: data.schema }
  }

  getReferences(_schema: JsonConfluentSchema): ReferenceType[] | undefined {
    return undefined
  }

  updateOptions(options: ProtocolOptions, _referredSchemas: string[]): ProtocolOptions {
    return options
  }
}
