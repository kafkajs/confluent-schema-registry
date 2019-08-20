const forge = require('mappersmith').default
const Retry = require('mappersmith/middlewares/retry/v2').default
import ErrorMiddleware from './errorMiddleware'

const CONTENT_TYPE = 'application/vnd.schemaregistry.v1+json'

const DEFAULT_RETRY = {
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 3, // max retries
}

const updateContentType = (response: any) =>
  response.enhance({
    headers: { 'content-type': 'application/json' },
  })

const ConfluentEncoder = () => ({
  request(req: any) {
    const headers = {
      'Content-Type': CONTENT_TYPE,
    }

    try {
      if (req.body()) {
        return req.enhance({
          headers,
          body: JSON.stringify(req.body()),
        })
      }
    } catch (e) {}

    return req.enhance({ headers })
  },

  response(next: any) {
    return next()
      .then(updateContentType)
      .catch((response: any) => {
        throw updateContentType(response)
      })
  },
})

export default ({ host, retry = {} }: any) => {
  return forge({
    clientId: 'Confluent_Schema_Registry',
    host,
    ignoreGlobalMiddleware: true,
    middleware: [
      ConfluentEncoder,
      Retry(Object.assign(DEFAULT_RETRY, retry)),
      ErrorMiddleware('SchemaRegistry'),
    ],
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
}
