import { ConfluentSchema, Serdes } from './@types'
import protobuf from 'protobufjs'

export default class ProtoSerdes implements Serdes {    
    public serialize(schema: ConfluentSchema, payload: any, opts: { messageName: undefined}) : Buffer {
        const parsedMessage = protobuf.parse(schema.schemaString);
        const root = parsedMessage.root
        const pkg = parsedMessage.package
    
        const message = root.lookupType(`${pkg}.${opts.messageName}`);
        return Buffer.from(message.encode(payload).finish())
    }

    public deserialize(schema: ConfluentSchema, buffer: Buffer, opts: { messageName: undefined}) : any {
        const parsedMessage = protobuf.parse(schema.schemaString);
        const root = parsedMessage.root
        const pkg = parsedMessage.package
    
        const message = root.lookupType(`${pkg}.${opts.messageName}`);
        return message.decode(buffer)
    }
 }