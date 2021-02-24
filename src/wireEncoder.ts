const DEFAULT_OFFSET = 0

export const MAGIC_BYTE = Buffer.alloc(1)

export const encode = (registryId: number, payload: Buffer) => {
  const registryIdBuffer = Buffer.alloc(4)
  registryIdBuffer.writeInt32BE(registryId, DEFAULT_OFFSET)

  return Buffer.concat([MAGIC_BYTE, registryIdBuffer, payload])
}
