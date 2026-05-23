import { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import { AuthRequest } from './auth'

// ── Attach user context to Sentry on authenticated requests ──────────────────
export const sentryUserContext = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authReq = req as AuthRequest
  if (authReq.user) {
    Sentry.setUser({
      id:    String(authReq.user.userId),
      email: authReq.user.email,
    })
    Sentry.setTag('tenant_id', String(authReq.user.tenantId))
  }
  next()
}

// ── Sentry error handler — must be last middleware before errorHandler ────────
export const sentryErrorHandler = Sentry.setupExpressErrorHandler
