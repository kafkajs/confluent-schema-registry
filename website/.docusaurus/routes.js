import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/confluent-schema-registry/markdown-page',
    component: ComponentCreator('/confluent-schema-registry/markdown-page', 'e22'),
    exact: true
  },
  {
    path: '/confluent-schema-registry/docs',
    component: ComponentCreator('/confluent-schema-registry/docs', 'b2d'),
    routes: [
      {
        path: '/confluent-schema-registry/docs',
        component: ComponentCreator('/confluent-schema-registry/docs', '6bb'),
        routes: [
          {
            path: '/confluent-schema-registry/docs',
            component: ComponentCreator('/confluent-schema-registry/docs', 'b7e'),
            routes: [
              {
                path: '/confluent-schema-registry/docs/advanced-usage',
                component: ComponentCreator('/confluent-schema-registry/docs/advanced-usage', 'e6d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/custom-types',
                component: ComponentCreator('/confluent-schema-registry/docs/custom-types', '413'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/development',
                component: ComponentCreator('/confluent-schema-registry/docs/development', '8c5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/introduction',
                component: ComponentCreator('/confluent-schema-registry/docs/introduction', '076'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/schema-avro',
                component: ComponentCreator('/confluent-schema-registry/docs/schema-avro', '776'),
                exact: true
              },
              {
                path: '/confluent-schema-registry/docs/schema-json',
                component: ComponentCreator('/confluent-schema-registry/docs/schema-json', 'a16'),
                exact: true
              },
              {
                path: '/confluent-schema-registry/docs/schema-protobuf',
                component: ComponentCreator('/confluent-schema-registry/docs/schema-protobuf', 'f52'),
                exact: true
              },
              {
                path: '/confluent-schema-registry/docs/schemas',
                component: ComponentCreator('/confluent-schema-registry/docs/schemas', '3d8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/usage',
                component: ComponentCreator('/confluent-schema-registry/docs/usage', '20c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/usage-with-kafkajs',
                component: ComponentCreator('/confluent-schema-registry/docs/usage-with-kafkajs', '786'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/confluent-schema-registry/docs/v2',
                component: ComponentCreator('/confluent-schema-registry/docs/v2', '105'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/confluent-schema-registry/',
    component: ComponentCreator('/confluent-schema-registry/', 'b36'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
