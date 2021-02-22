import { Schema, Serdes, ConfluentSubject } from './@types'

export default class ProtoSerdes implements Serdes {
  // @ts-ignore
  public validate(schema: Schema): void {
    return
  }

  // @ts-ignore
  public getSubject(schema: Schema, separator: string): ConfluentSubject {
    throw Error('not implemented yet')
  }
}
