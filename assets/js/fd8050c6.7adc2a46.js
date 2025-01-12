"use strict";(self.webpackChunkwebsite_new=self.webpackChunkwebsite_new||[]).push([[997],{147:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>a,contentTitle:()=>c,default:()=>h,frontMatter:()=>l,metadata:()=>r,toc:()=>o});const r=JSON.parse('{"id":"development","title":"Development","description":"To run the registry locally:","source":"@site/../docs/development.md","sourceDirName":".","slug":"/development","permalink":"/confluent-schema-registry/docs/development","draft":false,"unlisted":false,"editUrl":"https://github.com/kafkajs/confluent-schema-registry/edit/master/s/../docs/development.md","tags":[],"version":"current","frontMatter":{"id":"development","title":"Development","sidebar_label":"Development"},"sidebar":"docs","previous":{"title":"Migrating to version 2","permalink":"/confluent-schema-registry/docs/v2"}}');var t=s(4848),i=s(8453);const l={id:"development",title:"Development",sidebar_label:"Development"},c=void 0,a={},o=[{value:"Glossary",id:"glossary",level:3},{value:"References",id:"references",level:3},{value:"Publishing a new version",id:"publishing-a-new-version",level:3}];function d(e){const n={a:"a",code:"code",em:"em",h3:"h3",li:"li",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.p,{children:"To run the registry locally:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-sh",children:"docker-compose up\n"})}),"\n",(0,t.jsx)(n.p,{children:"To tail the logs:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-sh",children:'# Replace CONTAINER_ID with the container\'s ID\ndocker exec -it CONTAINER_ID bash -c "supervisorctl tail -f schema-registry"\n'})}),"\n",(0,t.jsx)(n.h3,{id:"glossary",children:"Glossary"}),"\n",(0,t.jsx)(n.p,{children:"This glossary shall help you when reading the code and understanding Schema Registry at large."}),"\n",(0,t.jsxs)(n.table,{children:[(0,t.jsx)(n.thead,{children:(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.th,{children:"Term"}),(0,t.jsx)(n.th,{children:"Description"})]})}),(0,t.jsxs)(n.tbody,{children:[(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"subject"}),(0,t.jsx)(n.td,{children:"The full name to be used to group a schema history. Consists of a namespace and a name."})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"namespace"}),(0,t.jsx)(n.td,{children:"The initial part of a subject. e.g. domain.your-project.some-feature"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"name"}),(0,t.jsx)(n.td,{children:"The final part of a subject. e.g. User"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"version"}),(0,t.jsxs)(n.td,{children:["The object containing id and the schema. Its own id is ",(0,t.jsx)(n.em,{children:"not"})," global, but unique for each subject."]})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"registryId"}),(0,t.jsxs)(n.td,{children:["The global id of a schema version. Retrieved by ",(0,t.jsx)(n.code,{children:"register"}),"."]})]})]})]}),"\n",(0,t.jsx)(n.h3,{id:"references",children:"References"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:(0,t.jsx)(n.a,{href:"https://docs.confluent.io/current/schema-registry/docs/serializer-formatter.html#wire-format",children:"Confluent wire format"})}),"\n",(0,t.jsx)(n.li,{children:(0,t.jsx)(n.a,{href:"https://github.com/confluentinc/schema-registry/tree/master/avro-serializer/src/main/java/io/confluent/kafka/serializers",children:"Java version"})}),"\n",(0,t.jsx)(n.li,{children:(0,t.jsx)(n.a,{href:"https://docs.confluent.io/current/avro.html",children:"Compatibility and schema evolution"})}),"\n"]}),"\n",(0,t.jsx)(n.h3,{id:"publishing-a-new-version",children:"Publishing a new version"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Create a new branch"}),"\n",(0,t.jsxs)(n.li,{children:["Update ",(0,t.jsx)(n.code,{children:"CHANGELOG.md"})," with all the relevant changes since the last release by ",(0,t.jsx)(n.a,{href:"https://github.com/kafkajs/confluent-schema-registry/compare/v1.0.5...master",children:"comparing commits"})," since last release"]}),"\n",(0,t.jsxs)(n.li,{children:["Bump the ",(0,t.jsx)(n.code,{children:"package.json"})," version and create a corresponding tag using ",(0,t.jsx)(n.code,{children:"npm version <major | minor | patch>"})]}),"\n",(0,t.jsx)(n.li,{children:"Push changes to your branch"}),"\n",(0,t.jsx)(n.li,{children:"Create PR, wait for successful builds"}),"\n",(0,t.jsx)(n.li,{children:"Merge PR"}),"\n",(0,t.jsxs)(n.li,{children:["Push tags ",(0,t.jsx)(n.code,{children:"git push --tags"}),", this will trigger a CI job which publishes the new version on ",(0,t.jsx)(n.code,{children:"npm"}),"."]}),"\n"]})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,n,s)=>{s.d(n,{R:()=>l,x:()=>c});var r=s(6540);const t={},i=r.createContext(t);function l(e){const n=r.useContext(i);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function c(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:l(e.components),r.createElement(i.Provider,{value:n},e.children)}}}]);