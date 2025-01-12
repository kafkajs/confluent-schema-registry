import { ReactNode } from 'react'
import clsx from 'clsx'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  description: ReactNode
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Simple interface',
    description: <>Communicate with Schema Registry via an easily understood interface</>,
  },
  {
    title: 'Solid and heavily used',
    description: (
      <>The source for this project has been running on large scale production projects for years</>
    ),
  },
  {
    title: 'All your schemas in one place',
    description: <>Full support for Avro, JSON Schema and Protobuf</>,
  },
]

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
