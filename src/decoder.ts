export default (buffer: any) => ({
  magicByte: buffer.slice(0, 1),
  registryId: buffer.slice(1, 5).readInt32BE(),
  payload: buffer.slice(5, buffer.length),
})
