export interface RawSchema {
  name: string
  namespace?: string
  type: 'record'
  fields: any[]
}
export interface Schema extends RawSchema {
  toBuffer: (payload: object) => Buffer // FIXME:
  fromBuffer: (payload: object) => Buffer // FIXME:
  isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
}

export interface SchemaReference {
  name: string
  subject: string
  version: number | string
}

export type SchemaRef = Omit<SchemaReference, 'name'>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toMatchConfluentAvroEncodedPayload(args: { registryId: number; payload: Buffer }): R
    }
  }
}
