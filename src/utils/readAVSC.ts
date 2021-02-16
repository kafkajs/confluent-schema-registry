import fs from 'fs'
import { promisify } from 'util'

import { RawAvroSchema } from '../@types'
import { ConfluentSchemaRegistryInvalidSchemaError } from '../errors'

const readFileAsync = promisify(fs.readFile)
const ENCODING = 'utf-8'

function isValidSchema(rawSchema: any): rawSchema is RawAvroSchema {
  return (
    'name' in rawSchema &&
    'type' in rawSchema &&
    rawSchema.type === 'record' &&
    'fields' in rawSchema
  )
}

function validatedSchema(path: string, rawSchema: any): RawAvroSchema {
  if (!isValidSchema(rawSchema)) {
    throw new ConfluentSchemaRegistryInvalidSchemaError(
      `${path} is not recognized as a valid AVSC file (expecting valid top-level name, type and fields attributes)`,
    )
  }
  return rawSchema
}

export function readAVSC(path: string): RawAvroSchema {
  const rawSchema = JSON.parse(fs.readFileSync(path, ENCODING))
  return validatedSchema(path, rawSchema)
}

export async function readAVSCAsync(path: string): Promise<RawAvroSchema> {
  const rawSchema = JSON.parse(await readFileAsync(path, ENCODING))
  return validatedSchema(path, rawSchema)
}
