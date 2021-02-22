import AvroSerdes from './AvroSerdes'
import JsonSerdes from './JsonSerdes'
import JsonSchema from './JsonSchema'
import ProtoSerdes from './ProtoSerdes'
import ProtoSchema from './ProtoSchema'
import { SchemaType, Serdes, ConfluentSchema, SchemaOptions, Schema } from './@types'
import { ConfluentSchemaRegistryArgumentError } from './errors'

const serdesTypeFromSchemaTypeMap: Record<string, Serdes> = {}

export const schemaTypeFromString = (schemaTypeString: string) => {
  switch (schemaTypeString) {
    case 'AVRO':
    case undefined:
      return SchemaType.AVRO
    case 'JSON':
      return SchemaType.JSON
    case 'PROTOBUF':
      return SchemaType.PROTOBUF
    default:
      return SchemaType.UNKNOWN
  }
}

export const serdesTypeFromSchemaType = (schemaType: SchemaType = SchemaType.AVRO): Serdes => {
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

export const schemaFromConfluentSchema = (
  confluentSchema: ConfluentSchema,
  opts?: SchemaOptions,
): Schema => {
  try {
    let schema: Schema

    switch (confluentSchema.type) {
      case SchemaType.AVRO: {
        schema = (serdesTypeFromSchemaType(confluentSchema.type) as AvroSerdes).getAvroSchema(
          confluentSchema,
          opts,
        )
        break
      }
      case SchemaType.JSON: {
        schema = new JsonSchema(confluentSchema, opts)
        break
      }
      case SchemaType.PROTOBUF: {
        schema = new ProtoSchema(confluentSchema, opts)
        break
      }
      default:
        throw new Error()
    }

    return schema
  } catch (err) {
    throw new ConfluentSchemaRegistryArgumentError(err.message)
  }
}
