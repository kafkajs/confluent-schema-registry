import avro, { ForSchemaOptions, types } from 'avsc'

import { RawSchema, Schema, SchemaRef } from './@types'

export default class Cache {
  registryIdBySubject: { [key: string]: number }
  schemasByRegistryId: { [key: string]: Schema }
  registryIdBySchemaRef: { [key: string]: number }
  forSchemaOptions?: Partial<ForSchemaOptions>

  constructor(forSchemaOptions?: Partial<ForSchemaOptions>) {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
    this.registryIdBySchemaRef = {}
    this.forSchemaOptions = forSchemaOptions
  }

  private schemaKeyGen = ({ subject, version }: SchemaRef): string => `${subject}:${version}`

  getRegistryIdBySchemaRef = (schema: SchemaRef): number =>
    this.registryIdBySchemaRef[this.schemaKeyGen(schema)]

  setRegistryIdBySchemaRef = (schema: SchemaRef, registryId: number) => {
    this.registryIdBySchemaRef[this.schemaKeyGen(schema)] = registryId

    return this.registryIdBySchemaRef[this.schemaKeyGen(schema)]
  }

  getLatestRegistryId = (subject: string): number | undefined => this.registryIdBySubject[subject]

  setLatestRegistryId = (subject: string, id: number): number => {
    this.registryIdBySubject[subject] = id

    return this.registryIdBySubject[subject]
  }

  getSchema = (registryId: number): Schema => this.schemasByRegistryId[registryId]

  setSchema = (
    registryId: number,
    schema: RawSchema,
    logicalTypesExtra: Record<string, new () => types.LogicalType> = {},
  ) => {
    // @ts-ignore TODO: Fix typings for Schema...
    this.schemasByRegistryId[registryId] = avro.Type.forSchema(schema, {
      ...this.forSchemaOptions,
      typeHook:
        typeof this.forSchemaOptions?.typeHook === 'function'
          ? this.forSchemaOptions?.typeHook
          : (attr, opts) => {
              if (typeof attr == 'string') {
                if (attr in opts.logicalTypes) {
                  return (opts.logicalTypes[attr] as unknown) as avro.Type
                }
                // if we map this as 'namespace.type'.
                const qualifiedName = `${opts.namespace}.${attr}`
                if (qualifiedName in opts.logicalTypes) {
                  return (opts.logicalTypes[qualifiedName] as unknown) as avro.Type
                }
              }
            },
      logicalTypes: {
        ...this.forSchemaOptions?.logicalTypes,
        ...logicalTypesExtra,
      },
    })

    return this.schemasByRegistryId[registryId]
  }

  clear = (): void => {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
