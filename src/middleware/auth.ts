import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from './errorHandler';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    roleId: number;
    email: string;
  };
}

// Verify JWT token
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as {
      userId: number;
      tenantId: number;
      roleId: number;
      email: string;
    };

    // Attach user to request
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as {
        userId: number;
        tenantId: number;
        roleId: number;
        email: string;
      };
      (req as AuthRequest).user = decoded;
    }
    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};
