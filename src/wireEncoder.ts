const DEFAULT_OFFSET = 0

export const MAGIC_BYTE = Buffer.alloc(1)

export const encode = (registryId: number, payload: Buffer, messageIndexes: number[] = [0]) => {
  const registryIdBuffer = Buffer.alloc(4)
  registryIdBuffer.writeInt32BE(registryId, DEFAULT_OFFSET)

  const messageIndexesBuffer = Buffer.from(messageIndexes)
  const messageIndexesLength = Buffer.alloc(4)
  messageIndexesLength.writeInt32BE(messageIndexesBuffer.length, DEFAULT_OFFSET)

  return Buffer.concat([
    MAGIC_BYTE,
    registryIdBuffer,
    messageIndexesLength,
    messageIndexesBuffer,
    payload,
  ])
}