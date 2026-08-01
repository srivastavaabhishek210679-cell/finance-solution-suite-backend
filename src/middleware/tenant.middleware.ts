import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Adds getTenantId helper to all requests
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  (req as any).getTenantId = () => authReq.user?.tenantId || 1;
  (req as any).getUserId = () => authReq.user?.userId || 1;
  (req as any).getRoleId = () => authReq.user?.roleId || 3;
  next();
};
