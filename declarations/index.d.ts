declare module 'confluent-schema-registry' {
  export interface SchemaRegistryCache {
    getLatestRegistryId: (subject: string) => number | undefined
    setLatestRegistryId: (subject: string, id: number) => void
    getSchema: (registryId: number) => Schema
    setSchema: (registryId: number, schema: Schema) => void
  }

  export interface Schema {
    toBuffer: (payload: object) => Buffer // FIXME:
    fromBuffer: (payload: object) => Buffer // FIXME:
    isValid: (payload: object, opts: { errorHook: (path: any) => void }) => void // FIXME:
    name: string
    namespace: string
  }

  export interface RegisteredSchema {
    id: number
  }

  export type COMPATIBILITY = 'NONE' | 'FULL' | 'BACKWARD' | 'FORWARD'

  export interface SchemaRegistryRegisterOptions {
    COMPATIBILITY: COMPATIBILITY
    separator: string
  }

  export interface SchemaRegistry {
    cache: SchemaRegistryCache
    register(schema: Schema, options?: SchemaRegistryRegisterOptions): Promise<RegisteredSchema>
    getSchema(registryId: number): Promise<Schema>
    encode(registryId: number, jsonPayload: any): Promise<Buffer>
    decode(buffer: Buffer): Promise<any>
    getRegistryId(subject: string, version: number): number
  }

  export interface SchemaRegistryConstructorRetryOptions {
    maxRetryTimeInSecs: number
    initialRetryTimeInSecs: number
    factor: number
    multiplier: number
    retries: number
  }

  export interface SchemaRegistryConstructorArgs {
    host: string
    retry?: SchemaRegistryConstructorRetryOptions
  }

  export type SchemaRegistryConstructor = new (
    args: SchemaRegistryConstructorArgs,
  ) => SchemaRegistry

  export const SchemaRegistry: SchemaRegistryConstructor
}
