import { MAGIC_BYTE } from './src/wireEncoder'
import decode from './src/wireDecoder'

const toMatchConfluentEncodedPayload = context => (received, { payload: expectedPayload }) => {
  const { printExpected, printReceived, printWithType } = context.utils

  if (!Buffer.isBuffer(expectedPayload)) {
    const error = [
      'Expect payload to be a Buffer',
      printWithType('Got', expectedPayload, printExpected),
    ].join('\n')

    throw new Error(error)
  }

  const { magicByte, payload } = decode(received)
  const expectedMessage = decode(expectedPayload)

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

expect.extend({
  toMatchConfluentEncodedPayload(...args) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return toMatchConfluentEncodedPayload(this)(...args)
  },
})
