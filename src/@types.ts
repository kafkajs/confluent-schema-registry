export interface Schema {
  toBuffer: (payload: object) => Buffer // FIXME:
  fromBuffer: (payload: object) => Buffer // FIXME:
  isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
  name: string
  namespace: string
}
