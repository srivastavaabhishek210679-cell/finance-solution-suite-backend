import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// ── Tenant Isolation Middleware ───────────────────────────────────────────────
// Ensures authenticated users can only access data belonging to their tenant.
// Attaches tenant_id to req.body and req.query automatically.

export const enforceTenantIsolation = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authReq = req as AuthRequest;

  // Only enforce on authenticated requests
  if (!authReq.user) {
    next();
    return;
  }

  const userTenantId = authReq.user.tenantId;

  if (!userTenantId) {
    res.status(403).json({
      status:  'error',
      code:    'NO_TENANT',
      message: 'User is not associated with any tenant',
    });
    return;
  }

  // ── Check body tenant_id ────────────────────────────────────────────────────
  if (req.body && typeof req.body === 'object') {
    if (
      'tenant_id' in req.body &&
      req.body.tenant_id !== undefined &&
      Number(req.body.tenant_id) !== userTenantId
    ) {
      console.warn(
        `[TenantIsolation] User ${authReq.user.email} (tenant ${userTenantId}) ` +
        `attempted to access tenant ${req.body.tenant_id}`,
      );
      res.status(403).json({
        status:  'error',
        code:    'TENANT_MISMATCH',
        message: 'Access denied — you cannot perform operations for another tenant',
      });
      return;
    }

    // Inject correct tenant_id into body
    req.body.tenant_id = userTenantId;
  }

  // ── Check query param tenant_id ─────────────────────────────────────────────
  if (req.query.tenant_id !== undefined) {
    if (Number(req.query.tenant_id) !== userTenantId) {
      console.warn(
        `[TenantIsolation] User ${authReq.user.email} (tenant ${userTenantId}) ` +
        `attempted to query tenant ${req.query.tenant_id}`,
      );
      res.status(403).json({
        status:  'error',
        code:    'TENANT_MISMATCH',
        message: 'Access denied — you cannot query another tenant\'s data',
      });
      return;
    }
  } else {
    // Auto-inject tenant_id into query so controllers can filter by it
    (req.query as Record<string, unknown>).tenant_id = String(userTenantId);
  }

  next();
};

// ── Super-admin bypass ────────────────────────────────────────────────────────
// Use this on admin-only routes that need cross-tenant access
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authReq = req as AuthRequest;

  // roleId 1 = super admin (adjust to match your roles table)
  if (!authReq.user || authReq.user.roleId !== 1) {
    res.status(403).json({
      status:  'error',
      code:    'FORBIDDEN',
      message: 'This action requires super-admin privileges',
    });
    return;
  }

  next();
};
