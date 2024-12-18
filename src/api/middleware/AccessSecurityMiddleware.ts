import { Middleware } from 'mappersmith'

export interface AccessTokenParams {
  readonly oauth: string 
  readonly ca?: string | Buffer
  readonly cert?: string | Buffer
  readonly key?: string | Buffer
  readonly proxy?: string
}

export default (params: AccessTokenParams): Middleware =>
  function AccessSecurityMiddleware() {
    return {
      async request(request) {
        return request.enhance({
          headers: {
            Authorization: `Bearer ${params.oauth}`,
          },
          ca: params.ca,
          cert: params.cert,
          key: params.key,
          proxy: params.proxy,
        })
      },
      async response(next, renew) {
        return next().catch(response => {
          if (response.status === 401) {
            return renew()
          }
          return next()
        })
      },
    }
  }
