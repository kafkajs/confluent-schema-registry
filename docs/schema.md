---
id: schemas
title: Schemas
sidebar_label: Schemas
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
