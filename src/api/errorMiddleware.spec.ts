import ErrorMiddleware from './errorMiddleware'

describe('ErrorMiddleware', () => {
  let middleware: any
  beforeEach(() => {
    middleware = ErrorMiddleware('test')()
  })

  describe('when the request succeeds', () => {
    it('does not interfere with the promise', async () => {
      await expect(middleware.response(() => Promise.resolve('value'))).resolves.toBe('value')
    })
  })

  describe('when the request fails', () => {
    const createResponse = (data: any) => ({
      data: jest.fn(() => data),
      status: jest.fn(() => 500),
      request: jest.fn(() => ({
        method: jest.fn(() => 'get'),
        url: jest.fn(() => 'url'),
      })),
    })

    it('raise an error with message, errorMessage or error from the error payload', async () => {
      let response = createResponse({ message: 'error message' })
      await expect(middleware.response(() => Promise.reject(response))).rejects.toHaveProperty(
        'message',
        'test - error message',
      )

      response = createResponse({ error: 'error error' })
      await expect(middleware.response(() => Promise.reject(response))).rejects.toHaveProperty(
        'message',
        'test - error error',
      )

      response = createResponse({ message: 'error errorMessage' })
      await expect(middleware.response(() => Promise.reject(response))).rejects.toHaveProperty(
        'message',
        'test - error errorMessage',
      )
    })

    it('raise an error with the error payload if it is a string', async () => {
      const response = createResponse('error string')
      await expect(middleware.response(() => Promise.reject(response))).rejects.toHaveProperty(
        'message',
        'test - error string',
      )
    })

    it('raise an error with a default message if the error payload is empty', async () => {
      const response = createResponse('')
      await expect(middleware.response(() => Promise.reject(response))).rejects.toHaveProperty(
        'message',
        'test - error, status 500',
      )
    })
  })
})
