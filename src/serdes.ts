import AvroSerdes from './AvroSerdes'
import JsonSerdes from './JsonSerdes'
import ProtoSerdes from './ProtoSerdes'
import { SchemaType, Serdes } from './@types'

const serdesTypeFromSchemaTypeMap: Record<string, Serdes> = {}

export const serdesTypeFromSchemaType = (schemaType: SchemaType): Serdes => {
  const schemaTypeStr = schemaType.toString()

  if (!serdesTypeFromSchemaTypeMap[schemaTypeStr]) {
    let serdes
    switch (schemaType) {
      case SchemaType.AVRO: {
        serdes = new AvroSerdes()
        break
      }
      case SchemaType.JSON: {
        serdes = new JsonSerdes()
        break
      }
      case SchemaType.PROTOBUF: {
        serdes = new ProtoSerdes()
        break
      }
      default:
        throw new Error()
    }
    serdesTypeFromSchemaTypeMap[schemaTypeStr] = serdes
  }
  return serdesTypeFromSchemaTypeMap[schemaTypeStr]
}
