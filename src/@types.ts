import { Resolver } from 'avsc'

export enum SchemaType {
  AVRO = 'AVRO',
  JSON = 'JSON',
  PROTOBUF = 'PROTOBUF',
  UNKNOWN = 'UNKNOWN',
}

export interface Serdes {
  validate(schema: Schema): void
  getSubject(confluentSchema: ConfluentSchema, schema: Schema, separator: string): ConfluentSubject
}

export type SchemaOptions = any

export interface Schema {
  toBuffer(payload: object): Buffer // FIXME:
  fromBuffer(buffer: Buffer, resolver?: Resolver, noCheck?: boolean): any
  isValid(
    payload: object,
    opts?: { errorHook: (path: Array<string>, value: any, type?: any) => void },
  ): boolean
}

export interface RawAvroSchema {
  name: string
  namespace?: string
  type: 'record'
  fields: any[]
}

export interface AvroSchema extends Schema, RawAvroSchema {}

export interface ConfluentSubject {
  name: string
}

export interface ConfluentSchema {
  type?: SchemaType
  schemaString: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toMatchConfluentEncodedPayload(args: { registryId: number; payload: Buffer }): R
    }
  }
}
