import path from 'path'
import avro from 'avsc'
import { exec } from 'child_process'
import fs from 'node:fs'

import SchemaRegistry from '../SchemaRegistry'
import { avdlToAVSCAsync } from './avdlToAVSC'

const registry = new SchemaRegistry({ host: 'http://localhost:8982' })
const absolutePath = (...paths: string[]) => path.join(__dirname, '../..', ...paths)

const promisifiedExec = async (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        return reject(error)
      }

      return resolve(stdout)
    })
  })
}

const compareWithJavaImplementation = (avdlPath: string, name: string) => async () => {
  const absolutePathToAvdlToAVSC = absolutePath('./bin/avdlToAVSC.sh')

  let expectedAVSC
  try {
    const result = await promisifiedExec(
      `${absolutePathToAvdlToAVSC} ./fixtures/avdl/${avdlPath} ${name}`,
    )
    expectedAVSC = JSON.parse(result)
  } catch (error) {
    console.error(`Error when running ${absolutePathToAvdlToAVSC}`, error) // eslint-disable-line no-console
    throw error
  }

  const avsc = await avdlToAVSCAsync(absolutePath('./fixtures/avdl', avdlPath))

  expect(avsc).toEqual(expectedAVSC)
  expect(avro.Type.forSchema(avsc)).toBeTruthy()
  expect(await registry.register(avsc)).toBeTruthy()
}

beforeAll(async () => {
  jest.setTimeout(10000)

  // deletes all the files from tmp dir
  const tmpDirectory = absolutePath('./tmp')
  try {
    fs.statSync(tmpDirectory)
  } catch (e) {
    fs.mkdirSync(tmpDirectory)
  }
  for (const file of fs.readdirSync(tmpDirectory)) {
    fs.unlinkSync(path.join(tmpDirectory, file))
  }
})

test('simple protocol', compareWithJavaImplementation('simple.avdl', 'Simple'))

test('protocol with two levels', compareWithJavaImplementation('two.avdl', 'Two'))

test('protocol with multiple levels', compareWithJavaImplementation('multiple.avdl', 'Multiple'))

test('protocol with union', compareWithJavaImplementation('union.avdl', 'Union'))

test(
  'protocol with multiple union levels',
  compareWithJavaImplementation('multiple_union.avdl', 'MultipleUnion'),
)

test('protocol with enum', compareWithJavaImplementation('enum.avdl', 'Enum'))

test('protocol with enum & union', compareWithJavaImplementation('enum_union.avdl', 'EnumUnion'))

test('protocol with array', compareWithJavaImplementation('array.avdl', 'Array'))

test('protocol with array & union', compareWithJavaImplementation('array_union.avdl', 'ArrayUnion'))

test('protocol with really complex stuff', compareWithJavaImplementation('complex.avdl', 'Complex'))

test(
  'protocol with multiple namespaces',
  compareWithJavaImplementation('multiple_namespaces.avdl', 'MultipleNamespaces'),
)

/*
 * AVSC includes the namespace of imported records even if they are being imported
 * into the same namespace, causing a difference against the Java version.
 *
 * @issue: https://github.com/mtth/avsc/issues/281
 */
test.skip(
  'protocol with import from same namespace',
  compareWithJavaImplementation('import.avdl', 'Import'),
)

test(
  'protocol with import from different namespace',
  compareWithJavaImplementation('import_multiple_namespaces.avdl', 'ImportMultipleNamespaces'),
)
