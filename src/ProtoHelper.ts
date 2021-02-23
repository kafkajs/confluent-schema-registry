// @ts-nocheck
import { Schema, SchemaHelper, ConfluentSubject, ConfluentSchema } from './@types'

export default class ProtoHelper implements SchemaHelper {
  public validate(schema: Schema): void {
    return
  }

  public getSubject(
    confluentSchema: ConfluentSchema,
    schema: Schema,
    separator: string,
  ): ConfluentSubject {
    throw Error('not implemented yet')
  }
}
