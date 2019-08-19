const {
  default: Dockest,
  logLevel,
  runners: { KafkaRunner, ZooKeeperRunner },
} = require('dockest')

const zooKeeperRunner = new ZooKeeperRunner({
  service: 'zooKeeper',
  ports: {
    [ZooKeeperRunner.DEFAULT_PORT]: ZooKeeperRunner.DEFAULT_PORT,
  },
})

// TODO: Introduce SchemaRegistryRunner

const kafkaRunner = new KafkaRunner({
  service: 'kafka',
  image: 'confluentinc/cp-kafka:5.2.2',
  dependsOn: [zooKeeperRunner],
  ports: {
    [KafkaRunner.DEFAULT_PORT_PLAINTEXT]: KafkaRunner.DEFAULT_PORT_PLAINTEXT,
    [KafkaRunner.DEFAULT_PORT_SSL]: KafkaRunner.DEFAULT_PORT_SSL,
    [KafkaRunner.DEFAULT_PORT_SASL_SSL]: KafkaRunner.DEFAULT_PORT_SASL_SSL,
  },
})

const dockest = new Dockest({
  runners: [kafkaRunner],
  jest: {
    lib: require('jest'),
    verbose: true,
  },
  opts: {
    logLevel: logLevel.DEBUG,
    afterSetupSleep: 10,
    dev: {
      // debug: false,
    },
  },
})

dockest.run()
