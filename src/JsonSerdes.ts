import { Schema, Serdes, ConfluentSubject, ConfluentSchema } from './@types'

export default class JsonSerdes implements Serdes {
  // @ts-ignore
  public validate(schema: Schema): void {
    return
  }

  // @ts-ignore
  public getSubject(confluentSchema: ConfluentSchema, schema: Schema, separator: string): ConfluentSubject {
    throw Error('not implemented yet')
  }
}
