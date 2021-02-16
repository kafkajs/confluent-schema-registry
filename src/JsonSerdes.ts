import { ConfluentSchema, Serdes, ConfluentSubject } from './@types'
import Ajv from 'ajv'

export default class JsonSerdes implements Serdes {
  private getJsonSchema(schema: ConfluentSchema, opts?: any) {
    const ajv = new Ajv(opts)
    const validate = ajv.compile(JSON.parse(schema.schemaString))
    return validate
  }

  private validatePayload(schema: ConfluentSchema, payload: any, opts: any) {
    const validate = this.getJsonSchema(schema, opts)
    if (!validate(payload)) {
      throw Error(validate.errors as any)
    }
  }

  public validate(schema: ConfluentSchema): void {
    this.getJsonSchema(schema)
  }

  // @ts-ignore
  public getSubject(schema: ConfluentSchema, separator: string): ConfluentSubject {
    throw Error('not implemented yet')
  }

  public serialize(schema: ConfluentSchema, payload: any, opts: any): Buffer {
    this.validatePayload(schema, payload, opts)
    return Buffer.from(JSON.stringify(payload))
  }

  public deserialize(schema: ConfluentSchema, buffer: Buffer, opts: any): any {
    const payload = JSON.parse(buffer.toString())
    this.validatePayload(schema, payload, opts)
    return payload
  }
}
