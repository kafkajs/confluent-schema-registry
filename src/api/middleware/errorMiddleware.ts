import { Middleware, Response } from 'mappersmith'

const getErrorMessage = (response: Response) => {
  const data = response.data()
  const error = data || null

  if (!error) {
    return `error, status ${response.status()}`
  }

  if (typeof error === 'object') {
    // @ts-ignore
    return error.message || error.errorMessage || error.error
  }

  return error
}

class ResponseError extends Error {
  status: number
  unauthorized: boolean
  url: string

  constructor(clientName: string, response: Response) {
    super(`${clientName} - ${getErrorMessage(response)}`)

    const request = response.request()
    this.name = this.constructor.name
    this.status = response.status()
    this.unauthorized = this.status === 401
    this.url = `${request.method()} ${request.url()}`
  }
}

const errorMiddleware: Middleware = ({ clientId }) => ({
  response: next =>
    new Promise((resolve, reject) =>
      next()
        .then(resolve)
        .catch((response: Response) => reject(new ResponseError(clientId, response))),
    ),
})

// const createErrorMiddleware = (clientName: string) => errorMiddleware()

export default errorMiddleware
