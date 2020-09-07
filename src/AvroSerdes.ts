import { AvroSchema, ConfluentSchema, Serdes, SchemaType } from './@types'
import avro from 'avsc'

export default class AvroSerdes implements Serdes {
    type: SchemaType = SchemaType.AVRO
    
    public serialize(schema: ConfluentSchema, payload: any) : Buffer {
        const avroSchema: AvroSchema = avro.Type.forSchema(JSON.parse(schema.schemaString))
        return avroSchema.toBuffer(payload)
    }

    public deserialize(schema: ConfluentSchema, buffer: Buffer) : any {
        const avroSchema: AvroSchema = avro.Type.forSchema(JSON.parse(schema.schemaString))
        return avroSchema.fromBuffer(buffer)    
    }
 }