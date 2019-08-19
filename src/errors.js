class ConfluentSchemaRegistryError extends Error {
  constructor(e) {
    super(e.message || e)
    this.name = this.constructor.name
  }
}

class ConfluentSchemaRegistryArgumentError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryCompatibilityError extends ConfluentSchemaRegistryError {}

module.exports = {
  ConfluentSchemaRegistryError,
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
}
