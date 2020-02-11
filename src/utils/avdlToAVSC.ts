import * as fs from 'fs'
import { assembleProtocol, readProtocol } from 'avsc'

import { ConfluentSchemaRegistryError } from '../errors'

interface AssembleProtocolError extends Error {
  path: string
}
interface Obj {
  [key: string]: any
}
interface Iterable extends Obj {
  map: any
}
interface Field {
  type: {
    type: string
    items: any
  }
}

let cache: any
const merge = Object.assign
const isObject = (obj: unknown): obj is Obj => obj && typeof obj === 'object'
const isIterable = (obj: unknown): obj is Iterable =>
  isObject(obj) && typeof obj.map !== 'undefined'
const isFieldArray = (field: unknown): field is Field =>
  isObject(field) && isObject(field.type) && field.type.type === 'array'

const combine = (rootType: any, types: any) => {
  if (!rootType.fields) {
    return rootType
  }

  const find = (name: any) => {
    if (typeof name === 'string') {
      name = name.toLowerCase()
    }

    const typeToCombine = types.find((t: any) => {
      const names = []
      if (t.namespace) {
        names.push(`${t.namespace}.`)
      }
      names.push(t.name.toLowerCase())

      return names.join('') === name
    })

    if (!typeToCombine || cache[typeToCombine.name]) {
      return null
    }

    cache[typeToCombine.name] = 1

    return combine(typeToCombine, types)
  }

  const combinedFields = rootType.fields.map((field: any) => {
    if (isFieldArray(field)) {
      const typeToCombine = find(field.type.items)
      return typeToCombine
        ? merge(field, { type: merge(field.type, { items: typeToCombine }) })
        : field
    } else if (isIterable(field.type)) {
      const type = field.type.map((unionType: any) => {
        if (isObject(unionType)) {
          const typeToCombine = find(unionType.items)
          return typeToCombine ? merge(unionType, { items: typeToCombine }) : unionType
        } else {
          return find(unionType) || unionType
        }
      })

      return merge(field, { type })
    }

    const typeToCombine = find(field.type)
    return typeToCombine ? merge(field, { type: typeToCombine }) : field
  })

  return merge(rootType, { fields: combinedFields })
}

export function avdlToAVSC(path: any) {
  cache = {}
  const protocol = readProtocol(fs.readFileSync(path, 'utf8'))

  return merge({ namespace: protocol.namespace }, combine(protocol.types.pop(), protocol.types))
}

export async function avdlToAVSCAsync(path: string) {
  cache = {}

  const protocol: { [key: string]: any } = await new Promise((resolve, reject) => {
    assembleProtocol(path, (err: AssembleProtocolError, schema) => {
      if (err) {
        reject(new ConfluentSchemaRegistryError(`${err.message}. Caused by: ${err.path}`))
      } else {
        resolve(schema)
      }
    })
  })

  return merge({ namespace: protocol.namespace }, combine(protocol.types.pop(), protocol.types))
}
