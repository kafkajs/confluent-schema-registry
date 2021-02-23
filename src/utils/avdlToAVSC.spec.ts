import path from 'path'
import fs from 'fs-extra'
import execa from 'execa'
import avro from 'avsc'

import SchemaRegistry from '../SchemaRegistry'
import { avdlToAVSCAsync } from './avdlToAVSC'

const registry = new SchemaRegistry({ host: 'http://localhost:8982' })
const absolutePath = (...paths: string[]) => path.join(__dirname, '../..', ...paths)

const compareWithJavaImplementation = (avdlPath: string, name: string) => async () => {
  const absolutePathToAvdlToAVSC = absolutePath('./bin/avdlToAVSC.sh')
  const execaArgs = [`./fixtures/avdl/${avdlPath}`, name]

  let expectedAVSC
  try {
    const { stdout: result } = await execa(absolutePathToAvdlToAVSC, execaArgs)
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
  await fs.emptyDir(absolutePath('./tmp'))
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
