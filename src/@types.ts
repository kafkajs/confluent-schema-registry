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
    default:
      return SchemaType.UNKNOWN
  }
}

export interface Serdes {
  serialize(schema: ConfluentSchema, payload: any): Buffer
  deserialize(schema: ConfluentSchema, buffer: Buffer): any
}

export interface AvroSchema {
  toBuffer: (payload: object) => Buffer // FIXME:
  fromBuffer(buffer: Buffer, resolver?: Resolver, noCheck?: boolean): any
  isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
  name: string | undefined
}

export interface ConfluentSubject {
  name: string
}

export interface ConfluentSchema {
  type: SchemaType
  schemaString: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toMatchConfluentAvroEncodedPayload(args: { registryId: number; payload: Buffer }): R
    }
  }
}
