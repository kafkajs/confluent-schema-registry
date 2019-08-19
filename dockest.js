const {
  default: Dockest,
  logLevel,
  runners: { KafkaRunner, ZooKeeperRunner, SimpleRunner },
} = require('dockest')

const zooKeeperRunner = new ZooKeeperRunner({
  service: 'zooKeeper',
  ports: {
    [ZooKeeperRunner.DEFAULT_PORT]: ZooKeeperRunner.DEFAULT_PORT,
  },
})

const schemaRegistryRunner = new SimpleRunner({
  service: 'schemaRegistry',
  image: 'confluentinc/cp-schema-registry:5.3.0',
  ports: {
    '8982': '8081',
  },
  environment: {
    SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL: `${zooKeeperRunner.runnerConfig.service}:${
      ZooKeeperRunner.DEFAULT_PORT
    }`,
    SCHEMA_REGISTRY_HOST_NAME: 'localhost',
  },
})

const kafkaRunner = new KafkaRunner({
  service: 'kafka',
  image: 'confluentinc/cp-kafka:5.2.2',
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
  },
})

dockest.run()
