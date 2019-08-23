import forge, { Client } from 'mappersmith'
import Retry, { RetryMiddlewareOptions } from 'mappersmith/middleware/retry/v2'

import { DEFAULT_API_CLIENT_ID } from '../constants'
import errorMiddlewaree from './middleware/errorMiddleware'
import confluentEncoder from './middleware/confluentEncoderMiddleware'

const DEFAULT_RETRY = {
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 3, // max retries
}

export interface SchemaRegistryAPIClientArgs {
  host: string
  clientId?: string
  retry?: Partial<RetryMiddlewareOptions>
}

export type SchemaRegistryAPIClient = Client<{
  Schema: {
    find: (_: any) => any
  }
  Subject: {
    all: (_: any) => any
    latestVersion: (_: any) => any
    version: (_: any) => any
    config: (_: any) => any
    updateConfig: (_: any) => any
    register: (_: any) => any
    compatible: (_: any) => any
  }
}>

export default ({
  clientId,
  host,
  retry = {},
}: SchemaRegistryAPIClientArgs): SchemaRegistryAPIClient =>
  forge({
    clientId: clientId || DEFAULT_API_CLIENT_ID,
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
