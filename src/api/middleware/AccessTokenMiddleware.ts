import { Middleware } from 'mappersmith'
let accessToken: string | null = null
let expiredAt: number | null = null

export interface AccessTokenParams {
  readonly clientCredentials: {
    readonly clientId: string
    readonly clientSecret: string
  }
  readonly authHost: string
  refreshToken(authHost: string, clientId: string, clientSecret: string): Promise<string>
  refreshThresholdMs?: number
}

export default (params: AccessTokenParams): Middleware =>
  function AccessTokenMiddleware() {
    return {
      async request(request) {
        return Promise.resolve(accessToken)
          .then(async token => {
            if (token && (!expiredAt || expiredAt > Date.now())) {
              return token
            }
            return await params.refreshToken(
              params.authHost,
              params.clientCredentials.clientId,
              params.clientCredentials.clientSecret,
            )
          })
          .then(token => {
            accessToken = token
            expiredAt = params.refreshThresholdMs ? Date.now() + params.refreshThresholdMs : null
            return request.enhance({
              headers: { Authorization: token },
            })
          })
      },
      async response(next, renew) {
        return next().catch(response => {
          // token expired
          if (response.status === 401) {
            accessToken = null
            return renew()
          }
          return next()
        })
      },
    }
  }
