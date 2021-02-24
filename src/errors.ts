class ConfluentSchemaRegistryError extends Error {
  constructor(error: any) {
    super(error.message || error)
    this.name = this.constructor.name
  }
}

class ConfluentSchemaRegistryArgumentError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryCompatibilityError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryInvalidSchemaError extends ConfluentSchemaRegistryError {}
class ConfluentSchemaRegistryValidationError extends ConfluentSchemaRegistryError {
  public paths: string[][]

  constructor(error: any, paths: string[][]) {
    super(error)
    this.paths = paths
  }
}

export {
  ConfluentSchemaRegistryError,
  ConfluentSchemaRegistryArgumentError,
  ConfluentSchemaRegistryCompatibilityError,
  ConfluentSchemaRegistryInvalidSchemaError,
  ConfluentSchemaRegistryValidationError,
}
