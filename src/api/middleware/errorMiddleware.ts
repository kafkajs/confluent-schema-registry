import { Middleware, Response } from 'mappersmith'

interface ConfluenceResponse extends Omit<Response, 'data'> {
  data: () => {
    message: string
  }
}

class ResponseError extends Error {
  status: number
  unauthorized: boolean
  url: string

  constructor(clientName: string, response: ConfluenceResponse) {
    super(
      `${clientName} - ${response.data().message ||
        `Error, status ${response.status()}${response.data() ? `: ${response.data()}` : ''}`}`,
    )

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

export default errorMiddleware
