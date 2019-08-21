import { Middleware, Response } from 'mappersmith'

const updateContentType = (response: Response) =>
  response.enhance({ headers: { 'content-type': 'application/json' } })

const confluentEncoderMiddleware: Middleware = () => ({
  request: req => {
    const headers = { 'Content-Type': 'application/vnd.schemaregistry.v1+json' }

    try {
      if (req.body()) {
        return req.enhance({
          headers,
          body: JSON.stringify(req.body()),
        })
      }
    } catch (_) {}

    return req.enhance({ headers })
  },

  response: next =>
    next()
      .then(updateContentType)
      .catch((response: Response) => {
        throw updateContentType(response)
      }),
})

export default confluentEncoderMiddleware
