import { Request } from 'mappersmith'

import UserAgentMiddleware from './userAgent'

const middlewareParams = (clientId?: string) => ({
  resourceName: 'resourceNameMock',
  resourceMethod: 'resourceMethodMock',
  context: { context: 'contextMock' },
  clientId,
})

describe('UserAgentMiddleware', () => {
  let next, request

  beforeEach(() => {
    request = ({
      enhance: jest.fn(),
    } as unknown) as jest.Mocked<Request>
    next = jest.fn().mockResolvedValue(request)
  })

  describe('When the user has provided a clientId', () => {
    const params = middlewareParams('some-client-id')

    it('should add the client id as a user agent comment', async () => {
      const middleware = UserAgentMiddleware(params)

      await middleware.prepareRequest(next, jest.fn())

      expect(request.enhance).toHaveBeenCalledWith({
        headers: {
          'User-Agent': `@kafkajs/confluent-schema-registry (${params.clientId})`,
        },
      })
    })
  })

  describe('When the user has not provided a clientId', () => {
    const params = middlewareParams()

    it('should not include a comment in the user agent', async () => {
      const middleware = UserAgentMiddleware(params)

      await middleware.prepareRequest(next, jest.fn())

      expect(request.enhance).toHaveBeenCalledWith({
        headers: {
          'User-Agent': `@kafkajs/confluent-schema-registry`,
        },
      })
    })
  })
})
