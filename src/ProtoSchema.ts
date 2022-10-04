import { Schema, ProtoOptions, ProtoConfluentSchema } from './@types'
import protobuf from 'protobufjs'
import { IParserResult, ReflectionObject, Namespace, Type } from 'protobufjs/light'
import {
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryValidationError,
} from './errors'

export default class ProtoSchema implements Schema {
  private message: Type

  constructor(schema: ProtoConfluentSchema, opts?: ProtoOptions) {
    const parsedMessage = protobuf.parse(schema.schema)
    const root = parsedMessage.root
    const referencedSchemas = opts?.referencedSchemas

    // handle all schema references independent on nested references
    if (referencedSchemas) {
      referencedSchemas.forEach(rawSchema => protobuf.parse(rawSchema.schema as string, root))
    }

    this.message = root.lookupType(this.getTypeName(parsedMessage, opts))
  }

  private getNestedTypeName(parent: { [k: string]: ReflectionObject } | undefined): string {
    if (!parent) throw new ConfluentSchemaRegistryArgumentError('no nested fields')
    const keys = Object.keys(parent)
    const reflection = parent[keys[0]]

    // Traverse down the nested Namespaces until we find a message Type instance (which extends Namespace)
    if (reflection instanceof Namespace && !(reflection instanceof Type) && reflection.nested)
      return this.getNestedTypeName(reflection.nested)
    return keys[0]
  }

  private getTypeName(parsedMessage: IParserResult, opts?: ProtoOptions): string {
    const root = parsedMessage.root
    const pkg = parsedMessage.package
    const name = opts && opts.messageName ? opts.messageName : this.getNestedTypeName(root.nested)
    return `${pkg ? pkg + '.' : ''}.${name}`
  }

  private trimStart(buffer: Buffer): Buffer {
    const index = buffer.findIndex((value: number) => value != 0)
    return buffer.slice(index)
  }

  public toBuffer(payload: object): Buffer {
    const paths: string[][] = []
    if (
      !this.isValid(payload, {
        errorHook: (path: Array<string>) => paths.push(path),
      })
    ) {
      throw new ConfluentSchemaRegistryValidationError('invalid payload', paths)
    }

    const protoPayload = this.message.create(payload)
    return Buffer.from(this.message.encode(protoPayload).finish())
  }

  public fromBuffer(buffer: Buffer): any {
    const newBuffer = this.trimStart(buffer)
    return this.message.decode(newBuffer)
  }

  public isValid(
    payload: object,
    opts?: { errorHook: (path: Array<string>, value: any, type?: any) => void },
  ): boolean {
    const errMsg: null | string = this.message.verify(payload)
    if (errMsg) {
      if (opts?.errorHook) {
        opts.errorHook([errMsg], payload)
      }
      return false
    }
    return true
  }
}
