import { Agent } from 'http'
import forge, { Authorization, Client, Options, GatewayConfiguration } from 'mappersmith'
import RetryMiddleware, { RetryMiddlewareOptions } from 'mappersmith/middleware/retry/v2'
import BasicAuthMiddleware from 'mappersmith/middleware/basic-auth'

import { DEFAULT_API_CLIENT_ID } from '../constants'
import errorMiddleware from './middleware/errorMiddleware'
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
  auth?: Authorization
  clientId?: string
  retry?: Partial<RetryMiddlewareOptions>
  /** HTTP Agent that will be passed to underlying API calls */
  agent?: Agent
}

// TODO: Improve typings
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
    registered: (_: any) => any
    compatible: (_: any) => any
  }
}>

export default ({
  auth,
  clientId,
  host,
  retry = {},
  agent,
}: SchemaRegistryAPIClientArgs): SchemaRegistryAPIClient => {
  // FIXME: ResourcesType typings is not exposed by mappersmith
  const manifest: Options<any> = {
    clientId: clientId || DEFAULT_API_CLIENT_ID,
    ignoreGlobalMiddleware: true,
    host,
    middleware: [
      confluentEncoder,
      RetryMiddleware(Object.assign(DEFAULT_RETRY, retry)),
      errorMiddleware,
      ...(auth ? [BasicAuthMiddleware(auth)] : []),
    ],
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
        registered: {
          method: 'post',
          path: '/subjects/{subject}',
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
  }
  // if an agent was provided, bind the agent to the mappersmith configs
  if (agent) {
    // gatewayConfigs is not listed as a type on manifest object in mappersmith
    ;((manifest as unknown) as { gatewayConfigs: Partial<GatewayConfiguration> }).gatewayConfigs = {
      HTTP: {
        configure: () => ({ agent }),
      },
    }
  }
  return forge(manifest)
}
