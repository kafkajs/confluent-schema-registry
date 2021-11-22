import { Resolver, ForSchemaOptions, Type } from 'avsc'
import { ValidateFunction } from './JsonSchema'
import Ajv from 'ajv'

export enum SchemaType {
  AVRO = 'AVRO',
  JSON = 'JSON',
  PROTOBUF = 'PROTOBUF',
  UNKNOWN = 'UNKNOWN',
}

export interface SchemaHelper {
  validate(schema: Schema): void
  getSubject(confluentSchema: ConfluentSchema, schema: Schema, separator: string): ConfluentSubject
}

export type AvroOptions = Partial<ForSchemaOptions>
export type JsonOptions = ConstructorParameters<typeof Ajv>[0] & {
  ajvInstance?: {
    compile: (schema: any) => ValidateFunction
  }
}
export type ProtoOptions = { messageName: string }

export interface LegacyOptions {
  forSchemaOptions?: AvroOptions
}
export interface ProtocolOptions {
  [SchemaType.AVRO]?: AvroOptions
  [SchemaType.JSON]?: JsonOptions
  [SchemaType.PROTOBUF]?: ProtoOptions
}
export type SchemaRegistryAPIClientOptions = ProtocolOptions | LegacyOptions

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

export interface AvroSchema
  extends Schema,
    RawAvroSchema,
    Pick<Type, 'equals' | 'createResolver'> {}

export interface ConfluentSubject {
  name: string
}

export interface AvroConfluentSchema {
  type: SchemaType.AVRO
  schema: string | RawAvroSchema
}

export interface ProtoConfluentSchema {
  type: SchemaType.PROTOBUF
  schema: string
}

export interface JsonConfluentSchema {
  type: SchemaType.JSON
  schema: string
}

export type ConfluentSchema = AvroConfluentSchema | ProtoConfluentSchema | JsonConfluentSchema

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toMatchConfluentEncodedPayload(args: { registryId: number; payload: Buffer }): R
    }
  }
}
