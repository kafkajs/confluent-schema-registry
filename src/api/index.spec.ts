import { Middleware } from 'mappersmith'
import API from '.'
import { mockClient, install, uninstall } from 'mappersmith/test'

const customMiddleware: Middleware = jest.fn(() => {
  return {
    async request(request) {
      return request.enhance({
        headers: {
          Authorization: 'Bearer Random',
        },
      })
    },
    async response(next) {
      return next()
    },
  }
})

const client = API({
  clientId: 'test-client',
  host: 'http://example.com',
  middlewares: [customMiddleware],
})
const mock = mockClient<typeof client>(client)
  .resource('Schema')
  .method('find')
  .with({ id: 'abc' })
  .response({})
  .assertObject()

describe('API Client', () => {
  beforeEach(() => install())

  afterEach(() => uninstall())

  it('should include a user agent header and call custom middleware', async () => {
    const response = await client.Schema.find({ id: 'abc' })

    expect(mock.callsCount()).toBe(1)
    expect(response.request().header('User-Agent')).not.toBeUndefined()
    expect(response.request().header('Authorization')).toBe('Bearer Random')
    expect(customMiddleware).toHaveBeenCalled()
  })
})
