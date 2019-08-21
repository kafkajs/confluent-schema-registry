import forge, { Client } from 'mappersmith'
import Retry, { RetryMiddlewareOptions } from 'mappersmith/middleware/retry/v2'

import ErrorMiddleware from './errorMiddleware'
import ConfluentEncoder from './ConfluentEncoder'

const DEFAULT_RETRY = {
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 3, // max retries
}

export interface APIArgs {
  host: string
  retry?: Partial<RetryMiddlewareOptions>
}

// export interface APIClient {
export type APIClient = Client<{
  Schema: {
    find: {}
  }
  Subject: {
    all: {}
    latestVersion: {}
    version: {}
    config: {}
    updateConfig: {}
    register: {}
    compatible: {}
  }
}>

export default ({ host, retry = {} }: APIArgs) =>
  forge({
    clientId: 'Confluent_Schema_Registry',
    // @ts-ignore
    ignoreGlobalMiddleware: true,
    host,

    middleware: [ConfluentEncoder, Retry(Object.assign(DEFAULT_RETRY, retry)), ErrorMiddleware],
    resources: {
      Schema: {
        find: { method: 'get', path: '/schemas/ids/{id}' },
      },
      Subject: {
        all: { method: 'get', path: '/subjects' },
        latestVersion: { method: 'get', path: '/subjects/{subject}/versions/latest' },
        version: { method: 'get', path: '/subjects/{subject}/versions/{version}' },

        config: { method: 'get', path: '/config/{subject}' },
        updateConfig: { method: 'put', path: '/config/{subject}' },

        register: { method: 'post', path: '/subjects/{subject}/versions' },
        compatible: {
          method: 'post',
          path: '/compatibility/subjects/{subject}/versions/{version}',
          params: { version: 'latest' },
        },
      },
    },
  })
