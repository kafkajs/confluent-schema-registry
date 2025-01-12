import { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: {
    'Getting started': ['introduction', 'usage', 'advanced-usage'],
    'How-to': ['custom-types', 'usage-with-kafkajs', 'schemas'],
    'Migration guides': ['v2'],
    Contributing: ['development'],
  },
}

export default sidebars
