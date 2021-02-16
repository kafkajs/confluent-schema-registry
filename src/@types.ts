import { Resolver } from 'avsc'

export enum SchemaType {
  AVRO = 'AVRO',
  JSON = 'JSON',
  PROTOBUF = 'PROTOBUF',
  UNKNOWN = 'UNKNOWN',
}

export const schemaTypeFromString = (schemaTypeString: string) => {
  switch (schemaTypeString) {
    case 'AVRO':
    case undefined:
      return SchemaType.AVRO
    case 'JSON':
      return SchemaType.JSON
    case 'PROTOBUF':
      return SchemaType.PROTOBUF
    default:
      return SchemaType.UNKNOWN
  }
}

export interface Serdes {
  validate(schema: ConfluentSchema): void
  getSubject(schema: ConfluentSchema, separator: string): ConfluentSubject
  serialize(schema: ConfluentSchema, payload: any, opts?: {}): Buffer
  deserialize(schema: ConfluentSchema, buffer: Buffer, opts?: {}): any
}

export interface RawAvroSchema {
  name: string
  namespace?: string
  type: 'record'
  fields: any[]
}

export interface AvroSchema extends RawAvroSchema {
  toBuffer: (payload: object) => Buffer // FIXME:
  fromBuffer(buffer: Buffer, resolver?: Resolver, noCheck?: boolean): any
  isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
}

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
