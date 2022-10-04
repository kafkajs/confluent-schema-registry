import { Schema, JsonOptions, JsonConfluentSchema } from './@types'
import Ajv from 'ajv'
import { ConfluentSchemaRegistryValidationError } from './errors'

interface BaseAjvValidationError {
  data?: unknown
  schema?: unknown
}
interface OldAjvValidationError extends BaseAjvValidationError {
  dataPath: string
  instancePath?: string
}
interface NewAjvValidationError extends BaseAjvValidationError {
  instancePath: string
}

type AjvValidationError = OldAjvValidationError | NewAjvValidationError

export interface ValidateFunction {
  (this: any, data: any): boolean
  errors?: null | AjvValidationError[]
}
export default class JsonSchema implements Schema {
  private validate: ValidateFunction

  constructor(schema: JsonConfluentSchema, opts?: JsonOptions) {
    this.validate = this.getJsonSchema(schema, opts)
  }

  private getJsonSchema(schema: JsonConfluentSchema, opts?: JsonOptions) {
    const ajv = opts?.ajvInstance ?? new Ajv(opts)
    const referencedSchemas = opts?.referencedSchemas
    if (referencedSchemas) {
      referencedSchemas.forEach(rawSchema => {
        const $schema = JSON.parse(rawSchema.schema)
        ajv.addSchema($schema, $schema['$id'])
      })
    }
    const validate = ajv.compile(JSON.parse(schema.schema))
    return validate
  }

  private validatePayload(payload: any) {
    const paths: string[][] = []
    if (!this.isValid(payload, { errorHook: path => paths.push(path) })) {
      throw new ConfluentSchemaRegistryValidationError('invalid payload', paths)
    }
  }

  public toBuffer(payload: object): Buffer {
    this.validatePayload(payload)
    return Buffer.from(JSON.stringify(payload))
  }

  public fromBuffer(buffer: Buffer): any {
    const payload = JSON.parse(buffer.toString())
    this.validatePayload(payload)
    return payload
  }

  public isValid(
    payload: object,
    opts?: { errorHook: (path: Array<string>, value: any, type?: any) => void },
  ): boolean {
    if (!this.validate(payload)) {
      if (opts?.errorHook) {
        for (const err of this.validate.errors as AjvValidationError[]) {
          const path = this.isOldAjvValidationError(err) ? err.dataPath : err.instancePath
          opts.errorHook([path], err.data, err.schema)
        }
      }
      return false
    }
    return true
  }

  private isOldAjvValidationError(error: AjvValidationError): error is OldAjvValidationError {
    return (error as OldAjvValidationError).dataPath != null
  }
}
