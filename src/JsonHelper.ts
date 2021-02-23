import { Schema, SchemaHelper, ConfluentSubject, ConfluentSchema } from './@types'

export default class JsonHelper implements SchemaHelper {
  // @ts-ignore
  public validate(schema: Schema): void {
    return
  }

  // @ts-ignore
  public getSubject(confluentSchema: ConfluentSchema, schema: Schema, separator: string): ConfluentSubject {
    throw Error('not implemented yet')
  }
}
