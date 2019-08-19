class ConfluentSchemaRegistryError extends Error {
  constructor(e: any) {
    super(e.message || e)
    this.name = this.constructor.name
  }
}

class ConfluentSchemaRegistryArgumentError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryCompatibilityError extends ConfluentSchemaRegistryError {}

export {
  ConfluentSchemaRegistryError,
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
}
