import AvroHelper from './AvroHelper'
import JsonHelper from './JsonHelper'
import JsonSchema from './JsonSchema'
import ProtoHelper from './ProtoHelper'
import ProtoSchema from './ProtoSchema'
import {
  SchemaType,
  SchemaHelper,
  ConfluentSchema,
  SchemaRegistryAPIClientOptions,
  LegacyOptions,
  ProtocolOptions,
  AvroOptions,
  JsonOptions,
  ProtoOptions,
  Schema,
  AvroSchema,
} from './@types'
import { ConfluentSchemaRegistryArgumentError } from './errors'

const helperTypeFromSchemaTypeMap: Record<string, SchemaHelper> = {}

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

export const helperTypeFromSchemaType = (
  schemaType: SchemaType = SchemaType.AVRO,
): SchemaHelper => {
  const schemaTypeStr = schemaType.toString()

  if (!helperTypeFromSchemaTypeMap[schemaTypeStr]) {
    let helper
    switch (schemaType) {
      case SchemaType.AVRO: {
        helper = new AvroHelper()
        break
      }
      case SchemaType.JSON: {
        helper = new JsonHelper()
        break
      }
      case SchemaType.PROTOBUF: {
        helper = new ProtoHelper()
        break
      }
      default:
        throw new ConfluentSchemaRegistryArgumentError('invalid schemaType')
    }
    helperTypeFromSchemaTypeMap[schemaTypeStr] = helper
  }
  return helperTypeFromSchemaTypeMap[schemaTypeStr]
}

export const schemaFromConfluentSchema = (
  confluentSchema: ConfluentSchema,
  options?: SchemaRegistryAPIClientOptions,
): Schema | AvroSchema => {
  try {
    let schema: Schema

    switch (confluentSchema.type) {
      case SchemaType.AVRO: {
        const opts: AvroOptions | undefined =
          (options as LegacyOptions)?.forSchemaOptions ||
          (options as ProtocolOptions)?.[SchemaType.AVRO]
        schema = (helperTypeFromSchemaType(confluentSchema.type) as AvroHelper).getAvroSchema(
          confluentSchema,
          opts,
        )
        break
      }
      case SchemaType.JSON: {
        const opts: JsonOptions | undefined = (options as ProtocolOptions)?.[SchemaType.JSON]
        schema = new JsonSchema(confluentSchema, opts)
        break
      }
      case SchemaType.PROTOBUF: {
        const opts: ProtoOptions | undefined = (options as ProtocolOptions)?.[SchemaType.PROTOBUF]
        schema = new ProtoSchema(confluentSchema, opts)
        break
      }
      default:
        throw new ConfluentSchemaRegistryArgumentError('invalid schemaType')
    }

    return schema
  } catch (err) {
    throw new ConfluentSchemaRegistryArgumentError(err.message)
  }
}
