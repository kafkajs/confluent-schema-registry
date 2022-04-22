import { Schema, SchemaHelper, ConfluentSubject, ConfluentSchema } from './@types'
import { ConfluentSchemaRegistryArgumentError, ConfluentSchemaRegistryError } from './errors'
import { IParserResult, parse } from 'protobufjs'

export default class ProtoHelper implements SchemaHelper {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public validate(_schema: Schema): void {
    return
  }

  public getSubject(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _confluentSchema: ConfluentSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _schema: Schema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _separator: string,
  ): ConfluentSubject {
    throw new ConfluentSchemaRegistryError('not implemented yet')
  }

  /**
   * Get the schemas referenced by the provided schema.
   *
   * @param schema The schema to find references for
   *
   * @returns A list of imported/referenced schemas that is used by the given schema.
   */
  public async referencedSchemas(schema: string): Promise<string[]> {
    let parsed: IParserResult
    try {
      parsed = parse(schema)
    } catch (err) {
      throw new ConfluentSchemaRegistryArgumentError(err)
    }
    const out: string[] = []
    return out.concat(parsed.imports || []).concat(parsed.weakImports || [])
  }
}
