import { themes as prismThemes } from 'prism-react-renderer'
import { Config } from '@docusaurus/types'

const config: Config = {
  title: 'Confluent Schema Registry',
  tagline: 'A library that makes it easier to interact with the Confluent schema registry',
  favicon: 'img/kafkajs-logoV2.svg',
  url: 'https://kafkajs.github.io',
  baseUrl: '/confluent-schema-registry',
  organizationName: 'kafkajs',
  projectName: 'confluent-schema-registry',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/kafkajs/confluent-schema-registry/edit/master/s',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Confluent Schema Registry',
      logo: {
        alt: 'Confluent Schema Registry Logo',
        src: 'img/kafkajs-logoV2.svg',
      },
      items: [
        { to: '/docs/introduction', label: 'Docs', position: 'left' },
        {
          href: 'https://github.com/kafkajs/confluent-schema-registry',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Kafkajs`,
      links: [
        {
          html: `
              <section class="footer-section">
                <div class="footer-container">
                  <a href="/confluent-schema-registry/" class="nav-home"><img src="/confluent-schema-registry/img/kafkajs-logoV2.svg" alt="Confluent schema registry" width="66" height="58"></a>
                  <iframe 
                    src="https://ghbtns.com/github-btn.html?user=kafkajs&repo=confluent-schema-registry&type=star&count=true&size=large" frameborder="0"
                    scrolling="0"
                    width="170"
                    height="30"
                    title="GitHub"></iframe>
                </div>
                  
                <a class="licence" href="https://github.com/kafkajs/confluent-schema-registry/blob/master/LICENSE">
                  <img alt="licence" src="https://img.shields.io/github/license/kafkajs/confluent-schema-registry?style=flat">
                </a>
              </section>
            `,
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
}

export default config
