class ConfluentSchemaRegistryError extends Error {
  constructor(error: any) {
    super(error.message || error)
    this.name = this.constructor.name
  }
}

class ConfluentSchemaRegistryArgumentError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryCompatibilityError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistrySerdesError extends ConfluentSchemaRegistryError {}

export {
  ConfluentSchemaRegistryError,
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
  ConfluentSchemaRegistrySerdesError,
}
