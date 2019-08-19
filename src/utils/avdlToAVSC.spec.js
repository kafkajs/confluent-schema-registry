const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const avro = require('avsc')

const SchemaRegistry = require('../')
const avdlToAVSC = require('./avdlToAVSC')

const registry = new SchemaRegistry({ host: 'http://localhost:8982' })
const absolutePath = (...paths) => path.join(__dirname, '../..', ...paths)
const TMP = absolutePath('./tmp')

const compareWithJavaImplementation = (avdlPath, name) => async () => {
  const expectedAVSC = await execa(absolutePath('./bin/avdlToAVSC.sh'), [
    `./fixtures/avdl/${avdlPath}`,
    name,
  ])
    .then(result => result.stdout)
    .then(JSON.parse)

  const avsc = avdlToAVSC(absolutePath('./fixtures/avdl', avdlPath))
  expect(avsc).toEqual(expectedAVSC)
  expect(avro.Type.forSchema(avsc)).toBeTruthy()
  expect(await registry.register(avsc)).toBeTruthy()
}

beforeAll(async () => {
  jest.setTimeout(10000)
  await fs.emptyDir(TMP)
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
