// @ts-nocheck
import { Schema, SchemaHelper, ConfluentSubject, ConfluentSchema } from './@types'
import { ConfluentSchemaRegistryError } from './errors'

export default class JsonHelper implements SchemaHelper {
  public validate(schema: Schema): void {
    return
  }

  public getSubject(
    confluentSchema: ConfluentSchema,
    schema: Schema,
    separator: string,
  ): ConfluentSubject {
    throw new ConfluentSchemaRegistryError('not implemented yet')
  }

  public async referencedSchemas(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _schema: string,
  ): Promise<string[]> {
    return []
  }
}
