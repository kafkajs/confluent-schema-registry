---
id: schemas
title: Example Avro Schemas
sidebar_label: Example Avro Schemas
---

## Unions with null

Schemas using unions with `null` are simple. You just have to provide the data or omit in case of `null`, example:

```avdl
@namespace("com.org.domain.examples")
protocol MyProtocol {
  record Picture {
    string url;
  }

  record Event {
    string name;
    union {null, Picture} picture = null;
  }
}
```

This schema can be satisfied with:

```JSON
{
  "name": "John",
  "picture": {
    "url": "https://..."
  }
}
```

or

```JSON
{
  "name": "John"
}
```

## Unions with different records

Unions with different records can have ambiguities, the data can be the same but for a different type. In these cases you have to provide a wrapped union type, example:

```avdl
@namespace("com.org.domain.examples")
protocol MyProtocol {
  record Picture {
    string url;
  }
  record Photo {
    string url;
  }

  record Event {
    string name;
    union {Picture, Photo} asset;
  }
}
```

This schema can be satisfied with:

```JSON
{
  "name": "John",
  "asset": {
    "com.org.domain.examples.Picture": {
      "url": "https://..."
    }
  }
}
```

or

```JSON
{
  "name": "John",
  "asset": {
    "com.org.domain.examples.Photo": {
      "url": "https://..."
    }
  }
}
```

## Imported schemas

Schemas can be imported from other AVDL or AVSC files using [the import declaration](https://avro.apache.org/docs/1.8.2/idl.html#imports). **Note** that this only works using `avdlToAVSCAsync`, not `avdlToAVSC`. Import paths are defined relative to the AVDL file they are imported from. In the following example, `person.avdl` is located next to this AVDL file.

```avdl
@namespace("com.org.domain.examples")
protocol MyProtocol {
  // AVDL files can be imported with "import idl"
  import idl 'person.avdl';

  // AVSC files can be imported with "import schema"
  import schema 'place.avsc';

  record Picture {
    string url;
  }

  record Event {
    Picture picture;
    com.org.domain.examples.Person person;
    com.org.domain.examples.Place place;
  }
}
```