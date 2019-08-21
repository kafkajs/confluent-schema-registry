import { MiddlewareDescriptor } from 'mappersmith'

import ErrorMiddleware from './errorMiddleware'

const middlewareParams = {
  resourceName: 'resourceNameMock',
  resourceMethod: 'resourceMethodMock',
  context: { context: 'contextMock' },
  clientId: 'clientIdMock',
}

describe('ErrorMiddleware', () => {
  let executedMiddleware: MiddlewareDescriptor

  beforeEach(() => {
    executedMiddleware = ErrorMiddleware(middlewareParams)
  })

  describe('when the request succeeds', () => {
    it('does not interfere with the promise', async () => {
      await expect(
        // @ts-ignore
        executedMiddleware.response(() => Promise.resolve('arbitrary value'), undefined),
      ).resolves.toBe('arbitrary value')
    })
  })

  describe('when the request fails', () => {
    const createResponse = data => ({
      data: jest.fn(() => data),
      status: jest.fn(() => 500),
      request: jest.fn(() => ({
        method: jest.fn(() => 'get'),
        url: jest.fn(() => 'url'),
      })),
    })

    it('raise an error with message, errorMessage or error from the error payload', async () => {
      let response = createResponse({ message: 'error message' })
      await expect(
        executedMiddleware.response(() => Promise.reject(response), undefined),
      ).rejects.toHaveProperty('message', `${middlewareParams.clientId} - error message`)

      response = createResponse({ error: 'error error' })
      await expect(
        executedMiddleware.response(() => Promise.reject(response), undefined),
      ).rejects.toHaveProperty('message', `${middlewareParams.clientId} - error error`)

      response = createResponse({ message: 'error errorMessage' })
      await expect(
        executedMiddleware.response(() => Promise.reject(response), undefined),
      ).rejects.toHaveProperty('message', `${middlewareParams.clientId} - error errorMessage`)
    })

    it('raise an error with the error payload if it is a string', async () => {
      const response = createResponse('error string')
      await expect(
        executedMiddleware.response(() => Promise.reject(response), undefined),
      ).rejects.toHaveProperty('message', `${middlewareParams.clientId} - error string`)
    })

    it('raise an error with a default message if the error payload is empty', async () => {
      const response = createResponse('')
      await expect(
        executedMiddleware.response(() => Promise.reject(response), undefined),
      ).rejects.toHaveProperty('message', `${middlewareParams.clientId} - error, status 500`)
    })
  })
})
