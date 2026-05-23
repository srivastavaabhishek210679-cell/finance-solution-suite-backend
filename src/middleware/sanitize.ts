import { Request, Response, NextFunction } from 'express';

// ── XSS patterns to strip ─────────────────────────────────────────────────────
const XSS_PATTERNS: [RegExp, string][] = [
  [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''],   // <script> blocks
  [/javascript\s*:/gi, ''],                                        // javascript: URLs
  [/on\w+\s*=\s*["'][^"']*["']/gi, ''],                           // inline event handlers
  [/on\w+\s*=\s*[^\s>]*/gi, ''],                                  // unquoted event handlers
  [/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ''],                    // iframes
  [/<object\b[^>]*>[\s\S]*?<\/object>/gi, ''],                    // objects
  [/<embed\b[^>]*>/gi, ''],                                        // embeds
  [/data\s*:\s*text\/html/gi, ''],                                 // data: URLs
  [/vbscript\s*:/gi, ''],                                          // vbscript: URLs
];

// ── SQL injection patterns to detect ─────────────────────────────────────────
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/g,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,           // OR 1=1
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,          // AND 1=1
];

// ── Sanitize a single string value ───────────────────────────────────────────
function sanitizeString(value: string): string {
  let sanitized = value;

  // Apply XSS patterns
  for (const [pattern, replacement] of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Encode remaining HTML special characters to prevent rendering
  sanitized = sanitized
    .replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return sanitized.trim();
}

// ── Check for SQL injection attempt ──────────────────────────────────────────
function hasSQLInjection(value: string): boolean {
  // Only check short strings — long text fields (descriptions) can contain SQL keywords legitimately
  if (value.length > 500) return false;

  return SQL_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

// ── Recursively sanitize any value ───────────────────────────────────────────
function sanitizeValue(value: unknown, path = ''): { value: unknown; blocked: string | null } {
  if (typeof value === 'string') {
    // Check for SQL injection in short fields
    if (hasSQLInjection(value) && !['description', 'message', 'content', 'body', 'notes', 'company_name', 'tenant_name', 'first_name', 'last_name'].includes(path)) {
      return { value: '', blocked: `SQL injection pattern detected in field: ${path}` };
    }
    return { value: sanitizeString(value), blocked: null };
  }

  if (Array.isArray(value)) {
    const sanitized: unknown[] = [];
    for (const item of value) {
      const result = sanitizeValue(item, path);
      if (result.blocked) return { value: null, blocked: result.blocked };
      sanitized.push(result.value);
    }
    return { value: sanitized, blocked: null };
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Skip sanitizing known safe fields (hashed passwords, tokens)
      if (['password', 'token', 'refresh_token', 'access_token', 'hash'].includes(key)) {
        sanitized[key] = val;
        continue;
      }
      const result = sanitizeValue(val, key);
      if (result.blocked) return { value: null, blocked: result.blocked };
      sanitized[key] = result.value;
    }
    return { value: sanitized, blocked: null };
  }

  // Numbers, booleans, null — pass through as-is
  return { value, blocked: null };
}

// ── Middleware ────────────────────────────────────────────────────────────────
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Only sanitize mutating methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    next();
    return;
  }

  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      const result = sanitizeValue(req.body);
      if (result.blocked) {
        res.status(400).json({
          status:  'error',
          code:    'INVALID_INPUT',
          message: 'Request contains potentially harmful content',
        });
        return;
      }
      req.body = result.value;
    }

    // Sanitize query params (strings only)
    if (req.query) {
      for (const [key, val] of Object.entries(req.query)) {
        if (typeof val === 'string') {
          const result = sanitizeValue(val, key);
          if (result.blocked) {
            res.status(400).json({
              status:  'error',
              code:    'INVALID_INPUT',
              message: 'Query parameter contains potentially harmful content',
            });
            return;
          }
          (req.query as Record<string, unknown>)[key] = result.value;
        }
      }
    }

    next();
  } catch (err) {
    // Never block a request due to sanitizer errors — log and continue
    console.error('[Sanitize] Error during sanitization:', err);
    next();
  }
};

// ── Validate UUID / integer IDs in route params ───────────────────────────────
export const validateId = (paramName = 'id') => (req: Request, res: Response, next: NextFunction): void => {
  const id = req.params[paramName];
  if (!id) { next(); return; }

  // Accept integer IDs or UUIDs
  const isInteger = /^\d+$/.test(id);
  const isUUID    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isInteger && !isUUID) {
    res.status(400).json({
      status:  'error',
      code:    'INVALID_ID',
      message: `Invalid ${paramName} format`,
    });
    return;
  }

  next();
};

