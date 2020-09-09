import { ConfluentSchema, Serdes } from './@types'
import protobuf from 'protobufjs'

export default class ProtoSerdes implements Serdes {    
    public serialize(schema: ConfluentSchema, payload: any) : Buffer {
        const root = protobuf.parse(schema.schemaString);
        const message = root.root.lookupType(`${root.package}`);
        return message.encode(payload).finish()
    }

    public deserialize(schema: ConfluentSchema, buffer: Buffer) : any {

    }
 }