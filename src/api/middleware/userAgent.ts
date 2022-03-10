import { Middleware } from 'mappersmith'
import { DEFAULT_API_CLIENT_ID } from '../../constants'

const product = '@kafkajs/confluent-schema-registry'

const userAgentMiddleware: Middleware = ({ clientId }) => {
  const comment = clientId !== DEFAULT_API_CLIENT_ID ? clientId : undefined
  const userAgent = comment ? `${product} (${comment})` : product
  const headers = {
    'User-Agent': userAgent,
  }
  return {
    prepareRequest: next => {
      return next().then(req => req.enhance({ headers }))
    },
  }
}

export default userAgentMiddleware
