import { Dockest, sleepWithLog, logLevel } from 'dockest'
import { DockestService } from 'dockest/dist/@types'

const dockest = new Dockest({
  composeFile: 'docker-compose.yml',
  dumpErrors: true,
  jestLib: require('jest'),
  jestOpts: {
    updateSnapshot: true,
  },
  logLevel: logLevel.DEBUG,
})

const dockestServices: DockestService[] = [
  {
    serviceName: 'zooKeeper',
    dependents: [
      {
        serviceName: 'kafka',
        readinessCheck: () => sleepWithLog(10, `Sleeping for Kafka`),
      },
    ],
  },
  {
    serviceName: 'schemaRegistry',
    readinessCheck: () => sleepWithLog(35, `Sleeping for Schema Registry`),
  },
]

dockest.run(dockestServices)