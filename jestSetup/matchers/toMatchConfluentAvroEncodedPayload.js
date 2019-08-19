const { MAGIC_BYTE } = require('../../src/encoder')
const decode = require('../../src/decoder')

module.exports = context => (received, { version: expectedVersion, payload: expectedPayload }) => {
  const { printExpected, printReceived, printWithType } = context.utils

  if (!Buffer.isBuffer(expectedPayload)) {
    const error = [
      'Expect payload to be a Buffer',
      printWithType('Got', expectedPayload, printExpected),
    ].join('\n')

    throw new Error(error)
  }

  const { magicByte, version, payload } = decode(received)
  const expectedMessage = decode(expectedPayload)

  if (!expectedVersion) {
    expectedVersion = expectedMessage.version
  }

  if (!Buffer.isBuffer(received)) {
    return {
      pass: false,
      message: () => [
        'Received value must be a Buffer',
        printWithType('Received', received, printReceived),
      ],
    }
  }

  if (Buffer.compare(MAGIC_BYTE, magicByte) !== 0) {
    return {
      pass: false,
      message: () =>
        [
          'expected magic byte',
          printExpected(MAGIC_BYTE),
          '\nreceived',
          printReceived(magicByte),
        ].join('\n'),
    }
  }

  if (!context.equals(version, expectedVersion)) {
    return {
      pass: false,
      message: () =>
        [
          'expected schema version',
          printExpected(expectedVersion),
          '\nreceived',
          printReceived(version),
        ].join('\n'),
    }
  }

  return {
    pass: context.equals(payload, expectedMessage.payload),
    message: () =>
      [
        'expected payload',
        printExpected(expectedMessage.payload),
        '\nreceived',
        printReceived(payload),
      ].join('\n'),
  }
}
