import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { AppDataSource } from '../../../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { LoginRequestDto, RegisterRequestDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { env } from '../../../utils/env-validator.js';

/**
 * Auth Controller - NextGen Pattern
 *
 * Handles authentication operations:
 * - Login (email/password + OAuth)
 * - Register
 * - Logout (current session + all devices)
 * - Refresh tokens
 * - Get current user (/me)
 */
export class AuthController extends BaseController {
  /**
   * POST /api/v1/auth/login
   * Login with email/password
   */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, password, deviceId } = req.body as LoginRequestDto;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    try {
      const result = await authenticationService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent,
      });

      // Set httpOnly cookies
      authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

      return BaseController.ok(res, {
        message: 'Login successful',
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error: any) {
      logger.error('[AuthController.login] Login error', {
        error: error.message,
        code: error.code,
        email,
      });

      // Handle specific auth errors
      if (error.code === 'INVALID_CREDENTIALS' || error.code === 'INVALID_USER') {
        return BaseController.unauthorized(res, error.message);
      }
      if (error.code === 'ACCOUNT_NOT_ACTIVE' || error.code === 'ACCOUNT_LOCKED') {
        return BaseController.forbidden(res, error.message);
      }
      if (error.code === 'TOO_MANY_ATTEMPTS') {
        return BaseController.error(res, error.message, 429);
      }
      return BaseController.error(res, 'Login failed');
    }
  }

  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<any> {
    const data = req.body as RegisterRequestDto;

    try {
      // Check password confirmation
      if (data.password !== data.passwordConfirm) {
        return BaseController.error(res, 'Passwords do not match', 400);
      }

      // Check TOS acceptance
      if (!data.tos) {
        return BaseController.error(res, 'Terms of service must be accepted', 400);
      }

      const userRepository = AppDataSource.getRepository(User);

      // Check if email exists
      const existingUser = await userRepository.findOne({ where: { email: data.email } });
      if (existingUser) {
        return BaseController.error(res, 'Email already exists', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, env.getNumber('BCRYPT_ROUNDS', 12));

      // Create new user
      const user = new User();
      user.email = data.email;
      user.password = hashedPassword;
      user.name = data.name;
      user.role = (data.role || 'customer') as UserRole;
      user.status = UserStatus.ACTIVE; // Immediately active

      await userRepository.save(user);

      // Create RoleAssignment for the new user
      const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
      const assignment = new RoleAssignment();
      assignment.userId = user.id;
      assignment.role = data.role || 'customer';
      assignment.isActive = true;
      assignment.validFrom = new Date();
      assignment.assignedAt = new Date();

      await assignmentRepository.save(assignment);

      // Send email verification (optional - don't fail if email fails)
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (emailError) {
        logger.warn('[AuthController.register] Email verification failed', {
          error: emailError,
          userId: user.id,
        });
      }

      // Login the user automatically after registration
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

      const loginResult = await authenticationService.login({
        provider: 'email',
        credentials: { email: data.email, password: data.password },
        ipAddress,
        userAgent,
      });

      // Set httpOnly cookies
      authenticationService.setAuthCookies(res, loginResult.tokens, loginResult.sessionId);

      return BaseController.created(res, {
        message: 'Registration successful',
        user: loginResult.user,
        accessToken: loginResult.tokens.accessToken,
        refreshToken: loginResult.tokens.refreshToken,
      });
    } catch (error: any) {
      logger.error('[AuthController.register] Registration error', {
        error: error.message,
        code: error.code,
        email: data.email,
      });

      return BaseController.error(res, 'Registration failed');
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout current session
   */
  static async logout(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    const sessionId = req.cookies?.sessionId;

    try {
      if (userId) {
        await authenticationService.logout(userId, sessionId);
      }

      authenticationService.clearAuthCookies(res);

      return BaseController.ok(res, {
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('[AuthController.logout] Logout error', {
        error: error.message,
        userId,
      });

      // Still clear cookies even if error occurs
      authenticationService.clearAuthCookies(res);

      return BaseController.ok(res, {
        message: 'Logout successful',
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   *
   * === Phase 2.5: Unified Error Response ===
   * All refresh failures return 401 with specific error codes.
   * Frontend should NOT retry on these errors - redirect to login instead.
   *
   * Error codes:
   * - NO_REFRESH_TOKEN: Token not provided in request
   * - REFRESH_TOKEN_INVALID: Token malformed, signature invalid, or from different server
   * - REFRESH_TOKEN_EXPIRED: Token has expired
   * - TOKEN_FAMILY_MISMATCH: Token rotation detected (possible theft)
   * - USER_NOT_FOUND: User does not exist or is inactive
   *
   * Response format:
   * - Success: { success: true, data: { accessToken, refreshToken, expiresIn } }
   * - Error: { success: false, error: "message", code: "ERROR_CODE", retryable: false }
   */
  static async refresh(req: Request, res: Response): Promise<any> {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      authenticationService.clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN',
        retryable: false,  // Phase 2.5: Frontend should NOT retry
      });
    }

    try {
      const tokens = await authenticationService.refreshTokens(refreshToken);

      authenticationService.setAuthCookies(res, tokens);

      return BaseController.ok(res, {
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 900, // Default 15 minutes
      });
    } catch (error: any) {
      logger.error('[AuthController.refresh] Token refresh error', {
        error: error.message,
        code: error.code,
      });

      // Phase 2.5: Always clear cookies on refresh failure
      authenticationService.clearAuthCookies(res);

      // Phase 2.5: Return specific error code for FE handling
      // All these errors are non-retryable - frontend should redirect to login
      const errorCode = error.code || 'REFRESH_TOKEN_INVALID';
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid or expired refresh token',
        code: errorCode,
        retryable: false,  // Phase 2.5: Frontend should NOT retry - redirect to login
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  static async me(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      return BaseController.ok(res, {
        user: req.user.toPublicData?.() || {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          status: req.user.status,
        },
      });
    } catch (error: any) {
      logger.error('[AuthController.me] Get user error', {
        error: error.message,
        userId: req.user.id,
      });

      return BaseController.error(res, 'Failed to get user data');
    }
  }

  /**
   * POST /api/v1/auth/logout-all
   * Logout from all devices
   */
  static async logoutAll(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      await authenticationService.logoutAll(userId);
      authenticationService.clearAuthCookies(res);

      return BaseController.ok(res, {
        message: 'Logged out from all devices',
      });
    } catch (error: any) {
      logger.error('[AuthController.logoutAll] Logout all error', {
        error: error.message,
        userId,
      });

      authenticationService.clearAuthCookies(res);

      return BaseController.error(res, 'Failed to logout from all devices');
    }
  }

  /**
   * GET /api/v1/auth/status
   * Check authentication status (public endpoint)
   */
  static async status(req: AuthRequest, res: Response): Promise<any> {
    const authenticated = !!req.user;

    return BaseController.ok(res, {
      authenticated,
      user: authenticated && req.user ? (req.user.toPublicData?.() || req.user) : null,
    });
  }
}
