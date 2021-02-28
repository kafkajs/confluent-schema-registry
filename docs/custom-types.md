---
id: custom-types
title: Configuring Custom Types
sidebar_label: Custom Types
---

Schemas can contain types that cannot be represented by Javascript primitive types, or
where there's more than one possible type to deserialize into. For example,
the Avro logical type `timestamp-millis` represents a date, but is serialized as a `long`.
In order to deserialize that into a `Date` object, we need to configure the schema library.

## Avro

`@kafkajs/confluent-schema-registry` uses the [`avsc`](https://github.com/mtth/avsc/wiki/Advanced-usage#logical-types)
library for Avro encoding/decoding. The [Schema Type Options](./usage.md#schema-type-options)
for Avro are passed to [`avsc.Type.forSchema`](https://github.com/mtth/avsc/wiki/API#typeforschemaschema-opts),
which allows us to set up a mapping between the logical type and the type we want to deserialize
into:

```ts
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry'
import avro from 'avsc'

class DateType extends avro.types.LogicalType {
  _fromValue(val: string) {
    return new Date(val);
  }
  _toValue(date: Date): number {
    return +date
  }
  _resolve(type: any) {
    if (avro.Type.isType(type, 'long', 'string', 'logical:timestamp-millis')) {
        return this._fromValue;
    }
  }
}


const options = {
  [SchemaType.AVRO]: {
    logicalTypes: { 'timestamp-millis': DateType }
  }
}
const registry = new SchemaRegistry({ host: 'http://localhost:9092' }, options)
```

### Custom long type

JavaScript represents all numbers as doubles internally, which means that it is possible
to lose precision when using very large numbers. In order to use a type that can
accomodate such large numbers, you can use the same configuration option as above to
have avsc use for example `BigInt` or `longjs` instead of the native `number` type.

See [Custom Long Types](https://github.com/mtth/avsc/wiki/Advanced-usage#custom-long-types)
for more details.