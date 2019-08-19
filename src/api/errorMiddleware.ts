const getErrorMessage = (response: any) => {
  const data = response.data()
  const error = data || null

  if (!error) {
    return `error, status ${response.status()}`
  }

  switch (typeof error) {
    case 'object':
      return error.message || error.errorMessage || error.error
    default:
      return error
  }
}

class ResponseError extends Error {
  status: any
  unauthorized: any
  url: any

  constructor(clientName: any, response: any) {
    super(`${clientName} - ${getErrorMessage(response)}`)

    const request = response.request()
    this.name = this.constructor.name
    this.status = response.status()
    this.unauthorized = this.status === 401
    this.url = `${request.method()} ${request.url()}`
  }
}

export default (clientName: any) => () => ({
  response(next: any) {
    return new Promise((resolve, reject) => {
      next()
        .then(resolve)
        .catch((response: any) => reject(new ResponseError(clientName, response)))
    })
  },
})
