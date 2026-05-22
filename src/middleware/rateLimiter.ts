import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// ── Shared error response ─────────────────────────────────────────────────────
const rateLimitHandler = (message: string) => (_req: Request, res: Response) => {
  res.status(429).json({
    status:   'error',
    code:     'RATE_LIMIT_EXCEEDED',
    message,
    retryAfter: res.getHeader('Retry-After'),
  });
};

// ── Global limiter — all API routes ──────────────────────────────────────────
// 200 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler('Too many requests. Please wait 15 minutes before trying again.'),
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// ── Auth limiter — login / register ───────────────────────────────────────────
// 10 attempts per 15 minutes — prevents brute force
export const authLimiter = rateLimit({
  windowMs:              15 * 60 * 1000,
  max:                   10,
  standardHeaders:       true,
  legacyHeaders:         false,
  skipSuccessfulRequests: true,   // only count failed attempts
  handler:               rateLimitHandler('Too many login attempts. Please wait 15 minutes before trying again.'),
});

// ── Export limiter — PDF/Excel/CSV downloads ──────────────────────────────────
// 30 exports per hour — prevents abuse of compute-heavy operations
export const exportLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler('Export limit reached. You can generate up to 30 exports per hour.'),
});

// ── API key limiter — for external integrations ───────────────────────────────
// 500 requests per 15 minutes — higher limit for service accounts
export const apiKeyLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             500,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler('API rate limit exceeded. Please reduce request frequency.'),
  keyGenerator: (req) => {
    // Use API key as identifier if present, otherwise use IP
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
});
