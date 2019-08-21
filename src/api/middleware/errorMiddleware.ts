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
  constructor(clientName: string, response: Response) {
    super(`${clientName} - ${getErrorMessage(response)}`)

    this.name = this.constructor.name
  }
}

const errorMiddleware: Middleware = ({ clientId }) => ({
  response: next => {
    return new Promise((resolve, reject) =>
      next()
        .then(resolve)
        .catch((response: Response) => reject(new ResponseError(clientId, response))),
    )
  },
})

// const createErrorMiddleware = (clientName: string) => errorMiddleware()

export default errorMiddleware
