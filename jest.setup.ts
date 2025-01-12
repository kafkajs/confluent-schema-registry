import { MAGIC_BYTE } from './src/wireEncoder'
import decode from './src/wireDecoder'
import { MatcherFunction } from 'expect'

const toMatchConfluentEncodedPayload: MatcherFunction<[{ payload: Buffer }]> = function(
  received,
  { payload: expectedPayload },
) {
  const { printExpected, printReceived, printWithType } = this.utils

  if (!Buffer.isBuffer(expectedPayload)) {
    const error = [
      'Expect payload to be a Buffer',
      printWithType('Got', expectedPayload, printExpected),
    ].join('\n')

    throw new Error(error)
  }

  const { magicByte, payload } = decode(received as Buffer)
  const expectedMessage = decode(expectedPayload)

  if (!Buffer.isBuffer(received)) {
    return {
      pass: false,
      message: () =>
        [
          'Received value must be a Buffer',
          printWithType('Received', received, printReceived),
        ].join('\n'),
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
    pass: this.equals(payload, expectedMessage.payload),
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
  toMatchConfluentEncodedPayload,
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toMatchConfluentEncodedPayload(args: { registryId: number; payload: Buffer }): R
    }
  }
}
