import { ConfluentSchema, Serdes } from './@types'
import protobuf from 'protobufjs'
import { IParserResult, Root } from 'protobufjs/light'

export default class ProtoSerdes implements Serdes {
  private getNestedTypeName(root: Root): string {
    const nested = root.nested
    if (!nested) throw Error('no nested fields')
    const keys = Object.keys(nested)
    return keys[0]
  }

  private getTypeName(parsedMessage: IParserResult, opts: { messageName: string }): string {
    const root = parsedMessage.root
    const pkg = parsedMessage.package
    const name = opts && opts.messageName ? opts.messageName : this.getNestedTypeName(root)
    return `${pkg ? pkg + '.' : ''}.${name}`
  }

  public serialize(schema: ConfluentSchema, payload: any, opts: { messageName: string }): Buffer {
    const parsedMessage = protobuf.parse(schema.schemaString)
    const root = parsedMessage.root

    const message = root.lookupType(this.getTypeName(parsedMessage, opts))
    const errMsg = message.verify(payload)
    if (errMsg) throw Error(errMsg)
    const protoPayload = message.create(payload)
    return Buffer.from(message.encode(protoPayload).finish())
  }

  public deserialize(schema: ConfluentSchema, buffer: Buffer, opts: { messageName: string }): any {
    const parsedMessage = protobuf.parse(schema.schemaString)
    const root = parsedMessage.root

    const message = root.lookupType(this.getTypeName(parsedMessage, opts))
    return message.decode(buffer)
  }
}
