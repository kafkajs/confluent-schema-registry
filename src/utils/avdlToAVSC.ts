import fs from 'fs'
import avro from 'avsc'

let cache: any
const merge = Object.assign
const isObject = (obj: any) => obj && typeof obj === 'object'
const isIterable = (obj: any) => isObject(obj) && typeof obj.map !== 'undefined'
const isFieldArray = (field: any) => isObject(field.type) && field.type.type === 'array'

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

export default (path: any) => {
  cache = {}
  const protocol = avro.readProtocol(fs.readFileSync(path, 'utf8'))

  return merge({ namespace: protocol.namespace }, combine(protocol.types.pop(), protocol.types))
}
