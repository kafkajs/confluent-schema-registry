import forge, { Client } from 'mappersmith'
import Retry, { RetryMiddlewareOptions } from 'mappersmith/middleware/retry/v2'

import errorMiddlewaree from './middleware/errorMiddleware'
import confluentEncoder from './middleware/confluentEncoderMiddleware'

const DEFAULT_RETRY = {
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 3, // max retries
}

export interface APIArgs {
  host: string
  clientId?: string
  retry?: Partial<RetryMiddlewareOptions>
}

// export interface APIClient {
export type APIClient = Client<{
  Schema: {
    find: any
  }
  Subject: {
    all: any
    latestVersion: any
    version: any
    config: any
    updateConfig: any
    register: any
    compatible: any
  }
}>

export default ({ clientId, host, retry = {} }: APIArgs) =>
  forge({
    clientId: clientId || 'Confluent_Schema_Registry',
    // @ts-ignore (https://github.com/tulios/mappersmith/pull/148)
    ignoreGlobalMiddleware: true,
    host,
    middleware: [confluentEncoder, Retry(Object.assign(DEFAULT_RETRY, retry)), errorMiddlewaree],
    resources: {
      Schema: {
        find: {
          method: 'get',
          path: '/schemas/ids/{id}',
        },
      },
      Subject: {
        all: {
          method: 'get',
          path: '/subjects',
        },
        latestVersion: {
          method: 'get',
          path: '/subjects/{subject}/versions/latest',
        },
        version: {
          method: 'get',
          path: '/subjects/{subject}/versions/{version}',
        },

        config: {
          method: 'get',
          path: '/config/{subject}',
        },
        updateConfig: {
          method: 'put',
          path: '/config/{subject}',
        },

        register: {
          method: 'post',
          path: '/subjects/{subject}/versions',
        },
        compatible: {
          method: 'post',
          path: '/compatibility/subjects/{subject}/versions/{version}',
          params: { version: 'latest' },
        },
      },
    },
  })
