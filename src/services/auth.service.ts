import jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { unauthorized } from '../middleware/errorHandler';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    userId: number;
    tenantId: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  token: string;
  expiresIn: string;
}

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // User login
  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.userService.findByEmail(data.email);

    // Verify password
    const isValid = await this.userService.verifyPassword(
      data.email,
      data.password
    );

    if (!isValid) {
      throw unauthorized('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw unauthorized('Account is not active');
    }

    // Update last login
    await this.userService.updateLastLogin(user.user_id);

    // Get user with permissions
    const userWithRole = await this.userService.getUserWithPermissions(
      user.user_id,
      user.tenant_id
    );

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

   // @ts-ignore - TypeScript has issues with expiresIn type
    const token = jwt.sign(
      {
        userId: user.user_id,
        tenantId: user.tenant_id,
        roleId: user.role_id,
        email: user.email,
      },
      secret,
      { expiresIn: expiresIn }
    );

    return {
      user: {
        userId: user.user_id,
        tenantId: user.tenant_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: userWithRole.role_name,
      },
      token,
      expiresIn,
    };
  }

  // Verify token
  verifyToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      return jwt.verify(token, secret);
    } catch (error) {
      throw unauthorized('Invalid token');
    }
  }

  // Refresh token
  async refreshToken(oldToken: string): Promise<AuthResponse> {
    const decoded = this.verifyToken(oldToken);

    // Get fresh user data
    const user = await this.userService.findById(
      decoded.userId,
      decoded.tenantId
    );

    // Generate new token
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  // @ts-ignore - TypeScript has issues with expiresIn type
    const token = jwt.sign(
      {
        userId: user.user_id,
        tenantId: user.tenant_id,
        roleId: user.role_id,
        email: user.email,
      },
      secret,
      { expiresIn: expiresIn }
    );

    return {
      user: {
        userId: user.user_id,
        tenantId: user.tenant_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: '',
      },
      token,
      expiresIn,
    };
  }
}
