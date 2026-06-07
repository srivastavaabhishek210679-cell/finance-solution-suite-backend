import * as Sentry from '@sentry/node'

const SENTRY_DSN = 'https://24c1a616d77a3db0dde40983590b43c9@o4511439760916480.ingest.us.sentry.io/4511439778217984'
const ENV = process.env.NODE_ENV || 'production'

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    enabled: ENV !== 'test',
    tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,
    release: process.env.npm_package_version || '1.0.0',
    ignoreErrors: ['Not Found', 'Route not found', 'Invalid token'],
    beforeSend(event) {
      // Filter out 404s and auth errors
      if (event.exception?.values?.[0]?.value?.includes('Route')) return null;
      return event;
    }
  })
  console.log('[Sentry] Initialised - environment: ' + ENV)
}

export function setSentryUser(user: { userId: number; tenantId: number; email: string; roleId?: number }): void {
  Sentry.setUser({ id: String(user.userId), email: user.email })
  Sentry.setTag('tenant_id', String(user.tenantId))
  if (user.roleId) Sentry.setTag('role_id', String(user.roleId))
}

export function captureError(error: Error, context: Record<string, any> = {}): void {
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value))
    Sentry.captureException(error)
  })
}

export function captureBusinessEvent(event: string, data: Record<string, any> = {}): void {
  Sentry.addBreadcrumb({ category: 'business', message: event, data, level: 'info' })
}

export function captureDBError(error: Error, query: string, params?: any[]): void {
  Sentry.withScope(scope => {
    scope.setTag('error_type', 'database')
    scope.setExtra('query', query)
    scope.setExtra('params', params)
    Sentry.captureException(error)
  })
}

export { Sentry }