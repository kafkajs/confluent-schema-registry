import { Middleware, Response } from 'mappersmith'

const REQUEST_HEADERS = {
  'Content-Type': 'application/vnd.schemaregistry.v1+json',
}

const updateContentType = (response: Response) =>
  response.enhance({
    headers: {
      'content-type': 'application/json',
    },
  })

const confluentEncoderMiddleware: Middleware = () => ({
  request: req => {
    try {
      if (req.body()) {
        return req.enhance({
          headers: REQUEST_HEADERS,
          body: JSON.stringify(req.body()),
        })
      }
    } catch (_) {}

    return req.enhance({ headers: REQUEST_HEADERS })
  },

  response: next =>
    next()
      .then(updateContentType)
      .catch((response: Response) => {
        throw updateContentType(response)
      }),
})

export default confluentEncoderMiddleware
