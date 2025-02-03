export default (buffer: Buffer) => {
  const magicByte = buffer.slice(0, 1)
  const registryId = buffer.slice(1, 5).readInt32BE(0)
  const messageIndexesLength = buffer.slice(5, 9).readInt32BE(0)
  const messageIndexes = buffer.slice(9, 9 + messageIndexesLength)
  const payload = buffer.slice(9 + messageIndexesLength)

  return {
    magicByte,
    registryId,
    messageIndexes,
    payload,
  }
}