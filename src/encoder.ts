const MAGIC_BYTE = Buffer.alloc(1)

const DEFAULT_OFFSET = 0
const encode = (registryId: any, payload: any) => {
  const registryIdBuffer = Buffer.alloc(4)
  registryIdBuffer.writeInt32BE(registryId, DEFAULT_OFFSET)

  return Buffer.concat([MAGIC_BYTE, registryIdBuffer, payload])
}

export { MAGIC_BYTE, encode }
