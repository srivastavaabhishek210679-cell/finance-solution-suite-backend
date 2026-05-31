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

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) { next(error); }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { company_name, tenant_id, role_id, ...rest } = req.body;

      if (company_name) {
        const { user, tenant_id: newTenantId, tenant_name } =
          await this.userService.createUserWithTenant({ company_name, ...rest });

        const fakeUser = { user_id: user.user_id, tenant_id: newTenantId, role_id: 1, email: user.email };
        const { token, refreshToken, expiresIn } = (this.authService as any).generateTokenPair(fakeUser);

        res.status(201).json({
          status:  'success',
          message: 'Account created successfully',
          data: {
            user:        { ...user, role: 'admin' },
            tenant_name,
            token,
            refreshToken,
            expiresIn,
            onboarding:  true,
          },
        });
      } else {
        const user = await this.userService.createUser({
          tenant_id: tenant_id || 1,
          role_id: role_id || 2,
          ...rest,
        });
        res.status(201).json({
          status:  'success',
          message: 'User registered successfully',
          data:    { user, onboarding: false },
        });
      }
    } catch (error) { next(error); }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      const result = await this.authService.refreshToken(token);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) { next(error); }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const userWithPermissions = await this.userService.getUserWithPermissions(user.userId, user.tenantId);
      res.status(200).json({ status: 'success', data: userWithPermissions });
    } catch (error) { next(error); }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);
      res.status(200).json({ status: 'success', ...result });
    } catch (error) { next(error); }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      const result = await this.authService.resetPassword(token, password);
      res.status(200).json({ status: 'success', ...result });
    } catch (error) { next(error); }
  };
}




