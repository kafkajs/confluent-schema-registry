import AvroSerdes from './AvroSerdes'
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
      default:
        throw new Error()
    }
    serdesTypeFromSchemaTypeMap[schemaTypeStr] = serdes
  }
  return serdesTypeFromSchemaTypeMap[schemaTypeStr]
}
