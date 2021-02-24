import { default as Dockest, runners, logLevel } from 'dockest'

const { ZooKeeperRunner, SimpleRunner, KafkaRunner } = runners

const zooKeeperRunner = new ZooKeeperRunner({
  service: 'zooKeeper',
  ports: {
    [ZooKeeperRunner.DEFAULT_PORT]: ZooKeeperRunner.DEFAULT_PORT,
  },
})

/**
 * Debug SchemaRegistry with CURL: https://docs.confluent.io/2.0.0/schema-registry/docs/intro.html
 */
const schemaRegistryRunner = new SimpleRunner({
  service: 'schemaRegistry',
  image: 'confluentinc/cp-schema-registry:5.5.3',
  ports: {
    '8982': '8081',
  },
  environment: {
    SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL: `${zooKeeperRunner.runnerConfig.service}:${ZooKeeperRunner.DEFAULT_PORT}`,
    SCHEMA_REGISTRY_HOST_NAME: 'localhost',
  },
})

const kafkaRunner = new KafkaRunner({
  service: 'kafka',
  image: 'confluentinc/cp-kafka:5.5.3',
  dependsOn: [zooKeeperRunner],
  ports: {
    [KafkaRunner.DEFAULT_PORT_PLAINTEXT]: KafkaRunner.DEFAULT_PORT_PLAINTEXT,
  },
})

const dockest = new Dockest({
  runners: [kafkaRunner, schemaRegistryRunner],
  jest: {
    lib: require('jest'),
    verbose: true,
  },
  opts: {
    logLevel: logLevel.DEBUG,
    afterSetupSleep: 35,
    dev: {
      debug: process.argv[2] === 'debug' || process.argv[2] === 'dev',
    },
  },
})

dockest.run()
