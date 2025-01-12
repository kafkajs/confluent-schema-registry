"use strict";(self.webpackChunkwebsite_new=self.webpackChunkwebsite_new||[]).push([[589],{1303:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>i,contentTitle:()=>a,default:()=>d,frontMatter:()=>c,metadata:()=>s,toc:()=>h});const s=JSON.parse('{"id":"schema-protobuf","title":"Example Protobuf Schemas","description":"Schema with references to other schemas","source":"@site/../docs/schema-protobuf.md","sourceDirName":".","slug":"/schema-protobuf","permalink":"/confluent-schema-registry/docs/schema-protobuf","draft":false,"unlisted":false,"editUrl":"https://github.com/kafkajs/confluent-schema-registry/edit/master/s/../docs/schema-protobuf.md","tags":[],"version":"current","frontMatter":{"id":"schema-protobuf","title":"Example Protobuf Schemas","sidebar_label":"Example Protobuf Schemas"}}');var r=n(4848),o=n(8453);const c={id:"schema-protobuf",title:"Example Protobuf Schemas",sidebar_label:"Example Protobuf Schemas"},a=void 0,i={},h=[{value:"Schema with references to other schemas",id:"schema-with-references-to-other-schemas",level:2}];function m(e){const t={code:"code",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h2,{id:"schema-with-references-to-other-schemas",children:"Schema with references to other schemas"}),"\n",(0,r.jsx)(t.p,{children:"You might want to split the Protobuf definition into several schemas, one for each type."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-protobuf",children:'syntax = "proto3";\npackage test;\nimport "test/B.proto";\n\nmessage A {\n\tint32 id = 1;\n\tB b = 2;\n}\n'})}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-protobuf",children:'syntax = "proto3";\npackage test;\n\nmessage B {\n\tint32 id = 1;\n}\n'})}),"\n",(0,r.jsx)(t.p,{children:"To register schemas with references, the schemas have to be registered in reverse order. The schema that references another schema has to be registered after the schema it references. In this example B has to be registered before A. Furthermore, when registering A, a list of references have to be provided. A reference consist of:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"name"})," - String matching the import statement. For example: ",(0,r.jsx)(t.code,{children:"test/B.proto"})]}),"\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"subject"})," - the subject the schema is registered under in the registry"]}),"\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"version"})," - the version of the schema you want to use"]}),"\n"]}),"\n",(0,r.jsx)(t.p,{children:"The library will handle an arbitrary number of nested levels."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-js",children:"const schemaA = `\n\tsyntax = \"proto3\";\n\tpackage test;\n\timport \"test/B.proto\";\n\n\tmessage A {\n\t\tint32 id = 1;\n\t\tB b = 2;\n\t}`\n\nconst schemaB = `\n\tsyntax = \"proto3\";\n\tpackage test;\n\n\tmessage B {\n\t\tint32 id = 1;\n\t}`\n\nawait schemaRegistry.register(\n\t{ type: SchemaType.PROTOBUF, schema: schemaB },\n\t{ subject: 'Proto:B' },\n)\n\nconst response = await schemaRegistry.api.Subject.latestVersion({ subject: 'Proto:B' })\nconst { version } = JSON.parse(response.responseData)\n\nconst { id } = await schemaRegistry.register(\n{\n\ttype: SchemaType.PROTOBUF,\n\tschema: schemaA,\n\treferences: [\n\t{\n\t\tname: 'test/B.proto',\n\t\tsubject: 'Proto:B',\n\t\tversion,\n\t},\n\t],\n},\n{ subject: 'Proto:A' },\n)\n\nconst obj = { id: 1, b: { id: 2 } }\n\nconst buffer = await schemaRegistry.encode(id, obj)\nconst decodedObj = await schemaRegistry.decode(buffer)\n"})})]})}function d(e={}){const{wrapper:t}={...(0,o.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(m,{...e})}):m(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>c,x:()=>a});var s=n(6540);const r={},o=s.createContext(r);function c(e){const t=s.useContext(o);return s.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function a(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:c(e.components),s.createElement(o.Provider,{value:t},e.children)}}}]);