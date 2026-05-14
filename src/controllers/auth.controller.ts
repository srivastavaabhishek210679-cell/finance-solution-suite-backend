import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export class AuthController {
  private authService: AuthService;
  private userService: UserService;

  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
  }

  // POST /api/v1/auth/login
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/register
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userService.createUser(req.body);

      res.status(201).json({
        status: 'success',
        data: user,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/refresh
  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.body;
      const result = await this.authService.refreshToken(token);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/auth/me
  getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as any).user;
      const userWithPermissions = await this.userService.getUserWithPermissions(
        user.userId,
        user.tenantId
      );

      res.status(200).json({
        status: 'success',
        data: userWithPermissions,
      });
    } catch (error) {
      next(error);
    }
  };
}
