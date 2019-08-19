const magicByte = Buffer.alloc(1)

const encode = (registryId, payload) => {
  const registryIdBuffer = Buffer.alloc(4)
  registryIdBuffer.writeInt32BE(registryId)

  return Buffer.concat([magicByte, registryIdBuffer, payload])
}

module.exports = {
  MAGIC_BYTE: magicByte,
  encode,
}
