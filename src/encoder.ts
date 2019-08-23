import { Schema } from './@types'

const DEFAULT_OFFSET = 0

// Based on https://github.com/mtth/avsc/issues/140
const collectInvalidPaths = (schema: Schema, jsonPayload: object) => {
  const paths: any = []
  schema.isValid(jsonPayload, {
    errorHook: path => paths.push(path),
  })

  return paths
}

export const MAGIC_BYTE = Buffer.alloc(1)

export const encode = (schema: Schema, registryId: number, jsonPayload: any) => {
  let avroPayload
  try {
    avroPayload = schema.toBuffer(jsonPayload)
  } catch (error) {
    error.paths = collectInvalidPaths(schema, jsonPayload)
    throw error
  }

  const registryIdBuffer = Buffer.alloc(4)
  registryIdBuffer.writeInt32BE(registryId, DEFAULT_OFFSET)

  return Buffer.concat([MAGIC_BYTE, registryIdBuffer, avroPayload])
}
