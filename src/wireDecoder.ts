export default (buffer: Buffer) => ({
  magicByte: buffer.slice(0, 1),
  registryId: buffer.slice(1, 5).readInt32BE(0),
  messageIndexes: buffer.slice(5, 6),
  payload: buffer.slice(6, buffer.length),
})
