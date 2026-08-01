import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// Cache permissions per role to avoid DB hits on every request
const permissionCache: { [roleId: number]: { perms: Set<string>; expiry: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRolePermissions(roleId: number): Promise<Set<string>> {
  const now = Date.now();
  if (permissionCache[roleId] && permissionCache[roleId].expiry > now) {
    return permissionCache[roleId].perms;
  }
  const result = await pool.query(
    'SELECT p.perm_code FROM role_permissions rp JOIN permissions p ON rp.perm_id=p.perm_id WHERE rp.role_id=$1',
    [roleId]
  );
  const perms = new Set<string>(result.rows.map((r: any) => r.perm_code));
  permissionCache[roleId] = { perms, expiry: now + CACHE_TTL };
  return perms;
}

// Clear cache when permissions change
export function clearPermissionCache(roleId?: number) {
  if (roleId) delete permissionCache[roleId];
  else Object.keys(permissionCache).forEach(k => delete permissionCache[parseInt(k)]);
}

// Main authorize middleware factory
export function authorize(...requiredPerms: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

      // Admin (role_id=1) always has full access
      if (user.roleId === 1) return next();

      const userPerms = await getRolePermissions(user.roleId);

      // Check if user has ALL required permissions
      const hasAll = requiredPerms.every(p => userPerms.has(p));
      if (!hasAll) {
        const missing = requiredPerms.filter(p => !userPerms.has(p));
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
          required: requiredPerms,
          missing
        });
      }
      next();
    } catch (e: any) {
      console.error('[RBAC] Error:', e.message);
      next(); // Fail open during errors to avoid blocking users
    }
  };
}

// Check single permission (use in controller logic)
export async function hasPermission(roleId: number, perm: string): Promise<boolean> {
  if (roleId === 1) return true;
  const perms = await getRolePermissions(roleId);
  return perms.has(perm);
}

// Get all permissions for a role
export async function getUserPermissions(roleId: number): Promise<string[]> {
  const perms = await getRolePermissions(roleId);
  return Array.from(perms);
}
