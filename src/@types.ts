export interface Schema {
  toBuffer: (payload: object) => Buffer // FIXME:
  fromBuffer: (payload: object) => Buffer // FIXME:
  isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
  name: string
  namespace: string
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
