import API from '.'
import { mockClient, install, uninstall } from 'mappersmith/test'

const client = API({ clientId: 'test-client', host: 'http://example.com' })
const mock = mockClient<typeof client>(client)
  .resource('Schema')
  .method('find')
  .with({ id: 'abc' })
  .response({})
  .assertObject()

describe('API Client', () => {
  beforeEach(() => install())

  afterEach(() => uninstall())

  it('should include a user agent header', async () => {
    const response = await client.Schema.find({ id: 'abc' })

    expect(mock.callsCount()).toBe(1)
    expect(response.request().header('User-Agent')).not.toBeUndefined()
  })
})
