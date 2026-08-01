import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize, clearPermissionCache, getUserPermissions } from '../middleware/authorize';
import pool from '../config/database';

const router = Router();
router.use(authenticate);

// Get all roles with permission counts
router.get('/roles', authorize('roles:read'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT r.*, COUNT(rp.perm_id) as permission_count FROM roles r LEFT JOIN role_permissions rp ON r.role_id=rp.role_id GROUP BY r.role_id ORDER BY r.role_id'
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Get permissions for a role
router.get('/roles/:roleId/permissions', authorize('roles:read'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT p.* FROM role_permissions rp JOIN permissions p ON rp.perm_id=p.perm_id WHERE rp.role_id=$1 ORDER BY p.perm_code',
      [req.params.roleId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Update permissions for a role
router.put('/roles/:roleId/permissions', authorize('roles:manage'), async (req: Request, res: Response) => {
  try {
    const { perm_ids } = req.body;
    const roleId = parseInt(req.params.roleId);
    if (roleId === 1) return res.status(400).json({ status: 'error', message: 'Cannot modify admin role permissions' });
    await pool.query('DELETE FROM role_permissions WHERE role_id=$1', [roleId]);
    for (const permId of perm_ids) {
      await pool.query('INSERT INTO role_permissions (role_id, perm_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [roleId, permId]);
    }
    clearPermissionCache(roleId);
    res.json({ status: 'success', message: 'Permissions updated' });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Get all permissions
router.get('/permissions', authorize('roles:read'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM permissions ORDER BY perm_code');
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Get current user permissions
router.get('/my-permissions', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const perms = await getUserPermissions(user.roleId);
    res.json({ status: 'success', data: { roleId: user.roleId, permissions: perms } });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Check specific permission
router.post('/check', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { permission } = req.body;
    const perms = await getUserPermissions(user.roleId);
    res.json({ status: 'success', data: { allowed: perms.includes(permission), permission } });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Assign role to user
router.put('/users/:userId/role', authorize('users:update'), async (req: Request, res: Response) => {
  try {
    const { role_id } = req.body;
    const tenantId = (req as any).user?.tenantId || 1;
    await pool.query('UPDATE users SET role_id=$1 WHERE user_id=$2 AND tenant_id=$3', [role_id, req.params.userId, tenantId]);
    res.json({ status: 'success', message: 'Role assigned' });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

export default router;
