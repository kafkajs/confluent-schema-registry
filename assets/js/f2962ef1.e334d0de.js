"use strict";(self.webpackChunkwebsite_new=self.webpackChunkwebsite_new||[]).push([[778],{7941:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>c,contentTitle:()=>a,default:()=>h,frontMatter:()=>i,metadata:()=>r,toc:()=>l});const r=JSON.parse('{"id":"schemas","title":"Example Avro Schemas","description":"Unions with null","source":"@site/../docs/schema.md","sourceDirName":".","slug":"/schemas","permalink":"/confluent-schema-registry/docs/schemas","draft":false,"unlisted":false,"editUrl":"https://github.com/kafkajs/confluent-schema-registry/edit/master/s/../docs/schema.md","tags":[],"version":"current","frontMatter":{"id":"schemas","title":"Example Avro Schemas","sidebar_label":"Example Avro Schemas"},"sidebar":"docs","previous":{"title":"Usage with KafkaJS","permalink":"/confluent-schema-registry/docs/usage-with-kafkajs"},"next":{"title":"Migrating to version 2","permalink":"/confluent-schema-registry/docs/v2"}}');var t=s(4848),o=s(8453);const i={id:"schemas",title:"Example Avro Schemas",sidebar_label:"Example Avro Schemas"},a=void 0,c={},l=[{value:"Unions with null",id:"unions-with-null",level:2},{value:"Unions with different records",id:"unions-with-different-records",level:2},{value:"Imported schemas",id:"imported-schemas",level:2}];function d(e){const n={a:"a",code:"code",h2:"h2",p:"p",pre:"pre",strong:"strong",...(0,o.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h2,{id:"unions-with-null",children:"Unions with null"}),"\n",(0,t.jsxs)(n.p,{children:["Schemas using unions with ",(0,t.jsx)(n.code,{children:"null"})," are simple. You just have to provide the data or omit in case of ",(0,t.jsx)(n.code,{children:"null"}),", example:"]}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-avdl",children:'@namespace("com.org.domain.examples")\nprotocol MyProtocol {\n  record Picture {\n    string url;\n  }\n\n  record Event {\n    string name;\n    union {null, Picture} picture = null;\n  }\n}\n'})}),"\n",(0,t.jsx)(n.p,{children:"This schema can be satisfied with:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-JSON",children:'{\n  "name": "John",\n  "picture": {\n    "url": "https://..."\n  }\n}\n'})}),"\n",(0,t.jsx)(n.p,{children:"or"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-JSON",children:'{\n  "name": "John"\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"unions-with-different-records",children:"Unions with different records"}),"\n",(0,t.jsx)(n.p,{children:"Unions with different records can have ambiguities, the data can be the same but for a different type. In these cases you have to provide a wrapped union type, example:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-avdl",children:'@namespace("com.org.domain.examples")\nprotocol MyProtocol {\n  record Picture {\n    string url;\n  }\n  record Photo {\n    string url;\n  }\n\n  record Event {\n    string name;\n    union {Picture, Photo} asset;\n  }\n}\n'})}),"\n",(0,t.jsx)(n.p,{children:"This schema can be satisfied with:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-JSON",children:'{\n  "name": "John",\n  "asset": {\n    "com.org.domain.examples.Picture": {\n      "url": "https://..."\n    }\n  }\n}\n'})}),"\n",(0,t.jsx)(n.p,{children:"or"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-JSON",children:'{\n  "name": "John",\n  "asset": {\n    "com.org.domain.examples.Photo": {\n      "url": "https://..."\n    }\n  }\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"imported-schemas",children:"Imported schemas"}),"\n",(0,t.jsxs)(n.p,{children:["Schemas can be imported from other AVDL or AVSC files using ",(0,t.jsx)(n.a,{href:"https://avro.apache.org/docs/1.8.2/idl.html#imports",children:"the import declaration"}),". ",(0,t.jsx)(n.strong,{children:"Note"})," that this only works using ",(0,t.jsx)(n.code,{children:"avdlToAVSCAsync"}),", not ",(0,t.jsx)(n.code,{children:"avdlToAVSC"}),". Import paths are defined relative to the AVDL file they are imported from. In the following example, ",(0,t.jsx)(n.code,{children:"person.avdl"})," is located next to this AVDL file."]}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-avdl",children:'@namespace("com.org.domain.examples")\nprotocol MyProtocol {\n  // AVDL files can be imported with "import idl"\n  import idl \'person.avdl\';\n\n  // AVSC files can be imported with "import schema"\n  import schema \'place.avsc\';\n\n  record Picture {\n    string url;\n  }\n\n  record Event {\n    Picture picture;\n    com.org.domain.examples.Person person;\n    com.org.domain.examples.Place place;\n  }\n}\n'})})]})}function h(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,n,s)=>{s.d(n,{R:()=>i,x:()=>a});var r=s(6540);const t={},o=r.createContext(t);function i(e){const n=r.useContext(o);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:i(e.components),r.createElement(o.Provider,{value:n},e.children)}}}]);