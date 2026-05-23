import * as Sentry from '@sentry/node'

const SENTRY_DSN = 'https://24c1a616d77a3db0dde40983590b43c9@o4511439760916480.ingest.us.sentry.io/4511439778217984'
const ENV        = process.env.NODE_ENV || 'production'

export function initSentry(): void {
  Sentry.init({
    dsn:         SENTRY_DSN,
    environment: ENV,
    enabled:     ENV !== 'test',

    // Performance monitoring — tracks DB queries, HTTP requests
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // Release tracking
    release: process.env.npm_package_version || '1.0.0',

    // Ignore common non-actionable errors
    ignoreErrors: [
      'Not Found',
      'Route not found',
    ],
  })

  console.log(`[Sentry] Initialised — environment: ${ENV}`)
}

// ── Set user context on authenticated requests ────────────────────────────────
export function setSentryUser(user: {
  userId:   number;
  tenantId: number;
  email:    string;
  roleId?:  number;
}): void {
  Sentry.setUser({
    id:    String(user.userId),
    email: user.email,
  })
  Sentry.setTag('tenant_id', String(user.tenantId))
  if (user.roleId) Sentry.setTag('role_id', String(user.roleId))
}

// ── Capture error with context ────────────────────────────────────────────────
export function captureError(error: Error, context: Record<string, any> = {}): void {
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value))
    Sentry.captureException(error)
  })
}

export { Sentry }
