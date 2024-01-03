import Long from 'long'
import { Schema, ProtoOptions, ProtoConfluentSchema } from './@types'
import protobuf from 'protobufjs'
import { Root, Namespace, Type } from 'protobufjs/light'
import { ConfluentSchemaRegistryValidationError } from './errors'

const MAX_VARINT_LEN_64 = 10

export default class ProtoSchema implements Schema {
  private namespace: Namespace

  constructor(schema: ProtoConfluentSchema, opts?: ProtoOptions) {
    const parsedMessage = protobuf.parse(schema.schema)
    const root = parsedMessage.root
    this.namespace = this.getNestedNamespace(parsedMessage.root, parsedMessage.package || '')

    const referencedSchemas = opts?.referencedSchemas
    // handle all schema references independent on nested references
    if (referencedSchemas) {
      referencedSchemas.forEach(rawSchema => protobuf.parse(rawSchema.schema as string, root))
    }
  }

  // getNestedNamespace traverses from the root down into the innermost namespace specified by the package name.
  // this should return the Namespace that encapsulates all of the message types for this schema.
  private getNestedNamespace(root: Root, pkg: string): Namespace {
    let ns: Namespace = root
    for (const name of pkg.split('.')) {
      if (!ns.nested) {
        throw new Error(`Unable to retrieve nested namespace '${pkg}' from root object`)
      }
      ns = ns.nested[name] as Namespace
      if (!(ns instanceof Namespace)) {
        throw new Error(
          `Failed to retrieve namespace '${pkg}' from root object, because nested object '${name}' is not a Namespace instance`,
        )
      }
    }
    return ns
  }

  // this encodes a payload against the specified schema with the proper message index bytes. if typeName is empty,
  // we default to the first schema in the namespace. if typeName is provided, we split it on '.' and access the
  // nested schema accordingly. for example, if typeName is 'Task', then the payload will be encoded with the
  // top level Task type in the namespace; if typeName is 'Task.TaskId', then payload will be encoded with the
  // TaskId message type nested inside of the top level Task message.
  //
  // for more information on this see https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html#wire-format
  public toBufferFromNestedType(payload: object, typeName = ''): Buffer {
    if (!typeName) {
      return this.toBuffer(payload)
    }

    const typeArray = typeName.split('.')
    const msgIndexes = new Array<number>(typeArray.length)
    let currentNamespace: Namespace = this.namespace
    // find the nested type (and store the message indexes along the way)
    for (const [i, name] of typeName.split('.').entries()) {
      const nestedMessageIndex = currentNamespace.orderedNestedMessages.findIndex(
        msg => msg.name === name,
      )
      if (nestedMessageIndex === -1) {
        throw new Error(
          `Unable to retrieve nested type '${typeName}' from namespace (failed at '${name}')`,
        )
      }
      const nestedMessage = currentNamespace.orderedNestedMessages[nestedMessageIndex]
      if (!(nestedMessage && nestedMessage instanceof Type)) {
        throw new Error(
          `Unable to retrieve nested type '${typeName}' from namespace (failed at '${name}')`,
        )
      }
      msgIndexes[i] = nestedMessageIndex
      currentNamespace = nestedMessage as Namespace
    }
    const schema = currentNamespace as Type

    const encodedMessageIndexes = this.encodeMessageIndexes(msgIndexes)
    const msgPayload = schema.create(payload)

    return Buffer.concat([encodedMessageIndexes, Buffer.from(schema.encode(msgPayload).finish())])
  }

  // this handles the common case where we default to the first message in the payload. in this case we encode the
  // message index bytes as just a single byte of 0. this function is partly here to conform to the Schema interface
  // -- the more general cases are handled by toBufferFromNestedType above.
  public toBuffer(payload: object): Buffer {
    if (!(this.namespace.orderedNestedMessages[0] instanceof Type)) {
      throw new Error(
        'Failed to retrieve schema to serialize protobuf message: nested message is not an instance of Type',
      )
    }
    const schema = this.namespace.orderedNestedMessages[0] as Type

    const paths: string[][] = []
    if (
      !this.validatePayloadAgainstSchema(schema, payload, {
        errorHook: (path: Array<string>) => paths.push(path),
      })
    ) {
      throw new ConfluentSchemaRegistryValidationError('invalid payload', paths)
    }

    return Buffer.from([0, ...schema.encode(schema.create(payload)).finish()])
  }

  // adapted from https://github.com/confluentinc/confluent-kafka-go/blob/af4a5f8b2018db6503f7e8097a25a24a6d6feb06/schemaregistry/serde/protobuf/protobuf.go#L295
  private encodeMessageIndexes(msgIndexes: Array<number>): Buffer {
    const encodedIndexes = Buffer.alloc((1 + msgIndexes.length) * MAX_VARINT_LEN_64)

    let totalLength = this.putVarint(encodedIndexes, msgIndexes.length, 0)

    for (const msgIndex of msgIndexes) {
      const length = this.putVarint(encodedIndexes, msgIndex, totalLength)
      totalLength += length
    }
    return encodedIndexes.slice(0, totalLength)
  }

  // adapted from https://go.dev/src/encoding/binary/varint.go
  private putVarint(buffer: Buffer, value: number, offset: number): number {
    let x = Long.fromNumber(value, true).shiftLeft(1) // unsigned 64 bit integer
    if (value < 0) {
      x = x.not()
    }
    let i = 0
    while (x.gte(0x80)) {
      buffer.writeUInt8((x.getLowBits() & 0x000000ff) | 0x80, offset + i)
      x = x.shiftRightUnsigned(7)
      i += 1
    }
    buffer.writeUInt8(x.getLowBits() & 0x000000ff, offset + i)
    return i + 1
  }

  public fromBuffer(buffer: Buffer): any {
    const [bytesRead, msgIndexes] = this.readMessageIndexes(buffer)
    const message = this.lookupMessage(msgIndexes)

    return message.decode(buffer.slice(bytesRead))
  }

  private lookupMessage(msgIndexes: Array<number>): Type {
    let currentNamespace: Namespace = this.namespace
    for (const idx of msgIndexes) {
      if (!(currentNamespace.orderedNestedMessages[idx] instanceof Type)) {
        throw new Error(
          'Failed to retrieve nested message from namespace: nested message is not an instance of Type',
        )
      }
      currentNamespace = currentNamespace.orderedNestedMessages[idx] as Namespace
    }
    return currentNamespace as Type
  }

  private readMessageIndexes(payload: Buffer): [number, Array<number>] {
    let [arrayLen, bytesRead] = this.parseVarint(payload)
    if (bytesRead <= 0) {
      throw new Error('unable to read message indexes')
    }
    if (arrayLen.lt(0)) {
      throw new Error('parsed invalid message index count')
    }
    if (arrayLen.eq(0)) {
      return [bytesRead, [0]]
    }

    const msgIndexes = new Array<number>(arrayLen.toInt())
    for (let i = 0; arrayLen.gt(i); i++) {
      const [idx, read] = this.parseVarint(payload.slice(bytesRead))
      if (read <= 0) {
        throw new Error('unable to read message indexes')
      }
      bytesRead += read
      msgIndexes[i] = idx.toInt()
    }

    return [bytesRead, msgIndexes]
  }

  // adapted from https://go.dev/src/encoding/binary/varint.go
  private parseVarint(buffer: Buffer): [Long, number] {
    const [ux, n] = this.parseUvarint(buffer)
    let x = ux.shiftRight(1).toSigned()
    if (ux.and(1).neq(0)) {
      x = x.not()
    }
    return [x, n]
  }

  private parseUvarint(buffer: Buffer): [Long, number] {
    let x = Long.UZERO // new unsigned 64 bit integer
    let s = 0

    for (let i = 0; i < buffer.length; i++) {
      if (i == MAX_VARINT_LEN_64) {
        // overflow
        return [Long.UZERO, -(i + 1)]
      }
      const b = buffer.readUInt8(i)
      if (b < 0x80) {
        if (i == MAX_VARINT_LEN_64 - 1 && b > 1) {
          // overflow
          return [Long.UZERO, -(i + 1)]
        }
        return [x.or(Long.fromBits(b, 0, true).shiftLeft(s)), i + 1]
      }
      x = x.or(new Long(b & 0x7f, 0, true))
      s += 7
    }
    return [Long.UZERO, 0]
  }

  // unimplemented -- this is part of the Schema interface, but because the protobuf schema namespace can
  // store multiple schemas we need something that can specify which schema we're validating against.
  // the validatePayloadAgainstSchema function below achieves this
  public isValid(
    _payload: object,
    _opts?: { errorHook: (path: Array<string>, value: any, type?: any) => void },
  ): boolean {
    return false
  }

  public validatePayloadAgainstSchema(
    schema: Type,
    payload: object,
    opts?: { errorHook: (path: Array<string>, value: any, type?: any) => void },
  ): boolean {
    const errMsg: null | string = schema.verify(payload)
    if (errMsg) {
      if (opts?.errorHook) {
        opts.errorHook([errMsg], payload)
      }
      return false
    }
    return true
  }
}
