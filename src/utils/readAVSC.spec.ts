import path from 'path'

import { readAVSC, readAVSCAsync } from './readAVSC'
import { ConfluentSchemaRegistryInvalidSchemaError } from '../errors'

describe('readAVSC', () => {
  it('throws an exception for invalid schema definitions', () => {
    const invalidSchemaFiles = ['invalidType', 'missingFields', 'missingName', 'missingType']
    invalidSchemaFiles.forEach(schemaName => {
      expect(() =>
        readAVSC(path.join(__dirname, `../../fixtures/avsc/invalid/${schemaName}.avsc`)),
      ).toThrow(ConfluentSchemaRegistryInvalidSchemaError)
    })
  })
})

describe('readAVSCAsync', () => {
  it('returns a validated schema asynchronously', async () => {
    return expect(
      readAVSCAsync(path.join(__dirname, `../../fixtures/avsc/person.avsc`)),
    ).resolves.toHaveProperty('name', 'Person')
  })
})
