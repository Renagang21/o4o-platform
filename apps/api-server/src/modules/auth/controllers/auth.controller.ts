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
import { deriveUserScopes } from '../../../utils/scope-assignment.utils.js';
import { deriveRoles } from '../../../utils/token.utils.js';

// Phase 5-B: Auth ↔ Infra Separation
// Auth 계층은 DB 상태 검사를 수행하지 않음.
// AppDataSource.isInitialized 체크는 Health Check에서만 수행.
// @see docs/architecture/auth-infra-separation.md

/**
 * Classify error for observability
 */
function classifyAuthError(error: Error): string {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('jwt_secret') || msg.includes('jwt_refresh_secret')) {
    return 'jwt-config-missing';
  }
  if (msg.includes('database') || msg.includes('connection') || msg.includes('typeorm') || msg.includes('repository')) {
    return 'db-connection-failed';
  }
  if (msg.includes('timeout')) {
    return 'timeout';
  }
  return 'unknown';
}

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
   * Check if request is cross-origin
   * Cross-origin requests need tokens in response body since cookies won't work
   *
   * Same base domain subdomains (e.g., admin.neture.co.kr + api.neture.co.kr)
   * are NOT considered cross-origin since cookies with domain .neture.co.kr will work.
   */
  private static isCrossOriginRequest(req: Request): boolean {
    const origin = req.get('origin');
    if (!origin) return false;

    try {
      const originHost = new URL(origin).hostname;
      const apiHost = req.get('host')?.split(':')[0] || '';

      // Extract base domain (e.g., neture.co.kr from admin.neture.co.kr)
      const getBaseDomain = (hostname: string) => {
        const parts = hostname.split('.');
        // For domains with two-part TLDs like .co.kr, .com.au, etc.
        if (parts.length >= 3 && ['co', 'com', 'net', 'org', 'ac', 'go'].includes(parts[parts.length - 2])) {
          return parts.slice(-3).join('.');
        }
        // For simple TLDs like .com, .kr, .site
        return parts.slice(-2).join('.');
      };

      const originBaseDomain = getBaseDomain(originHost);
      const apiBaseDomain = getBaseDomain(apiHost);

      // Same base domain = NOT cross-origin (cookies with .domain will work)
      // Different base domain = cross-origin (need tokens in body)
      // e.g., admin.neture.co.kr + api.neture.co.kr = same base domain (neture.co.kr) = NOT cross-origin
      // e.g., glycopharm.co.kr + api.neture.co.kr = different base domains = cross-origin
      return originBaseDomain !== apiBaseDomain;
    } catch {
      return false;
    }
  }

  /**
   * POST /api/v1/auth/login
   * Login with email/password
   *
   * Phase 6-7: Cookie Auth Primary
   * - httpOnly cookies are the primary authentication method
   * - JSON body tokens are optional (for legacy client support)
   * - Pass includeLegacyTokens: true in request body to receive tokens in response
   * - Cross-origin requests automatically receive tokens in response body
   */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, password, deviceId, includeLegacyTokens } = req.body as LoginRequestDto & { includeLegacyTokens?: boolean };
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Cross-origin requests need tokens in response body since cookies won't work
    const isCrossOrigin = AuthController.isCrossOriginRequest(req);
    const includeTokensInBody = includeLegacyTokens || isCrossOrigin;

    // Phase 5-B: Auth ↔ Infra Separation
    // Auth는 DB 상태를 검사하지 않음. DB 실패 시 자연스럽게 500 반환.
    // 503은 Health Check의 책임. Auth는 인증 판단만 담당.
    // @see docs/architecture/auth-infra-separation.md

    try {
      const result = await authenticationService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent,
      });

      // Phase 6-7: Cookie Auth Primary
      // Set httpOnly cookies as primary authentication method
      // Uses request origin for multi-domain cookie support
      authenticationService.setAuthCookies(req, res, result.tokens, result.sessionId);

      // Response: Cookie is primary, JSON tokens for cross-origin or legacy support
      return BaseController.ok(res, {
        message: 'Login successful',
        user: result.user,
        // Include tokens for cross-origin requests or when explicitly requested
        ...(includeTokensInBody && {
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          },
        }),
      });
    } catch (error: any) {
      // P1 Fix: Enhanced error logging with classification
      const errorTag = classifyAuthError(error);
      logger.error('[AuthController.login] Login error', {
        error: error.message,
        name: error.name,
        code: error.code,
        tag: errorTag,
        email,
        stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      });

      // Handle specific auth errors with specific error codes
      if (error.code === 'INVALID_CREDENTIALS' || error.code === 'INVALID_USER') {
        return BaseController.unauthorized(res, error.message, error.code);
      }
      if (error.code === 'ACCOUNT_NOT_ACTIVE' || error.code === 'ACCOUNT_LOCKED') {
        return BaseController.forbidden(res, error.message, error.code);
      }
      if (error.code === 'TOO_MANY_ATTEMPTS') {
        return BaseController.error(res, error.message, 429);
      }

      // Phase 5-B: Auth ↔ Infra Separation
      // Auth는 503을 반환하지 않음. 인프라 문제는 500으로 처리.
      // Cloud Run이 Health Check를 통해 인스턴스 상태를 관리.
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

      // Phase 3: membershipType에 따라 role 분기
      // Validate role against UserRole enum to prevent DB enum errors
      const VALID_ROLES = ['super_admin', 'admin', 'vendor', 'seller', 'user', 'business', 'partner', 'supplier', 'manager', 'customer'];
      const rawRole = data.membershipType === 'student'
        ? 'user'
        : (data.role || 'customer');
      const effectiveRole = VALID_ROLES.includes(rawRole) ? rawRole : 'user';

      // User 생성 (트랜잭션 내 KPA member 포함)
      const user = await AppDataSource.transaction(async (manager) => {
        const txUserRepo = manager.getRepository(User);

        // Create new user
        const newUser = new User();
        newUser.email = data.email;
        newUser.password = hashedPassword;
        newUser.lastName = data.lastName;
        newUser.firstName = data.firstName;
        newUser.name = `${data.lastName}${data.firstName}`;
        newUser.nickname = data.nickname;
        newUser.role = effectiveRole as UserRole;
        newUser.serviceKey = data.service || 'platform';
        if (data.phone) {
          newUser.phone = data.phone.replace(/\D/g, '');
        }
        if (data.pharmacistFunction) {
          newUser.pharmacistFunction = data.pharmacistFunction;
        }
        if (data.pharmacistRole) {
          newUser.pharmacistRole = data.pharmacistRole;
        }

        // businessInfo: 사업자 정보 + 면허번호 저장
        const businessInfo: Record<string, string> = {};
        if (data.licenseNumber) {
          businessInfo.licenseNumber = data.licenseNumber;
        }
        if (data.businessName) {
          businessInfo.businessName = data.businessName;
        }
        if (data.businessNumber) {
          businessInfo.businessNumber = data.businessNumber;
        }
        if (Object.keys(businessInfo).length > 0) {
          newUser.businessInfo = businessInfo;
        }

        await txUserRepo.save(newUser);

        // KPA Society: auto-create KPA member with organization
        if (data.service === 'kpa-society' && data.organizationId) {
          const licenseNum = data.membershipType === 'pharmacist' ? (data.licenseNumber || null) : null;

          const memberResult = await manager.query(`
            INSERT INTO kpa_members (user_id, organization_id, membership_type, license_number, university_name, role, status, identity_status)
            VALUES ($1, $2, $3, $4, $5, 'member', 'pending', 'active')
            RETURNING id
          `, [
            newUser.id,
            data.organizationId,
            data.membershipType || 'pharmacist',
            licenseNum,
            data.membershipType === 'student' ? (data.universityName || null) : null,
          ]);

          // 서비스별 승인 레코드 생성 (kpa-a: 커뮤니티)
          if (memberResult[0]?.id) {
            await manager.query(`
              INSERT INTO kpa_member_services (member_id, service_key, status)
              VALUES ($1, 'kpa-a', 'pending')
            `, [memberResult[0].id]);
          }
        }

        return newUser;
      });

      // RoleAssignment 생성 (비필수 - 테이블 스키마 불일치 시에도 회원가입은 성공)
      try {
        const assignRepo = AppDataSource.getRepository(RoleAssignment);
        const assignment = new RoleAssignment();
        assignment.userId = user.id;
        assignment.role = effectiveRole;
        assignment.isActive = true;
        assignment.validFrom = new Date();
        assignment.assignedAt = new Date();
        await assignRepo.save(assignment);
      } catch (roleError: any) {
        logger.warn('[AuthController.register] RoleAssignment creation failed (non-fatal)', {
          userId: user.id,
          role: effectiveRole,
          error: roleError.message,
        });
      }

      // Send email verification (optional - don't fail if email fails)
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (emailError) {
        logger.warn('[AuthController.register] Email verification failed', {
          error: emailError,
          userId: user.id,
        });
      }

      // P0-T1: No auto-login after registration (status = PENDING)
      return BaseController.created(res, {
        message: 'Registration submitted. Please wait for operator approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
        pendingApproval: true,
      });
    } catch (error: any) {
      logger.error('[AuthController.register] Registration error', {
        error: error.message,
        code: error.code,
        email: data.email,
      });

      // UNIQUE violation → 409
      if (error.code === '23505' || error.driverError?.code === '23505') {
        const detail = error.detail || error.driverError?.detail || '';
        if (detail.includes('license_number')) {
          return BaseController.error(res, '이미 등록된 면허번호입니다. 기존 계정으로 로그인해 주세요.', 409);
        }
        if (detail.includes('user_id')) {
          return BaseController.error(res, '이미 가입된 회원입니다.', 409);
        }
        return BaseController.error(res, 'Registration conflict', 409);
      }

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

      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('[AuthController.logout] Logout error', {
        error: error.message,
        userId,
      });

      // Still clear cookies even if error occurs
      authenticationService.clearAuthCookies(req, res);

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
      authenticationService.clearAuthCookies(req, res);
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN',
        retryable: false,  // Phase 2.5: Frontend should NOT retry
      });
    }

    try {
      const tokens = await authenticationService.refreshTokens(refreshToken);

      // Phase 6-7: Cookie Auth Primary
      // Set new tokens in httpOnly cookies
      // Uses request origin for multi-domain cookie support
      authenticationService.setAuthCookies(req, res, tokens);

      // Response: Cookie is primary, JSON tokens for cross-origin or legacy support
      const isCrossOrigin = AuthController.isCrossOriginRequest(req);
      const includeTokensInBody = req.body.includeLegacyTokens === true || isCrossOrigin;

      return BaseController.ok(res, {
        message: 'Token refreshed successfully',
        expiresIn: tokens.expiresIn || 900, // Default 15 minutes
        // Include tokens for cross-origin requests or when explicitly requested
        ...(includeTokensInBody && {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
        }),
      });
    } catch (error: any) {
      logger.error('[AuthController.refresh] Token refresh error', {
        error: error.message,
        code: error.code,
      });

      // Phase 2.5: Always clear cookies on refresh failure
      authenticationService.clearAuthCookies(req, res);

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
      // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1: roles 도출
      const roles = deriveRoles(req.user);

      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 계산
      const scopes = deriveUserScopes({
        role: req.user.role,
        roles,
      });

      const userData = req.user.toPublicData?.() || {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        roles,  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1
        status: req.user.status,
        scopes: [] as string[],
      };

      // roles / scopes 주입 (toPublicData 이미 roles 포함하지만 일관성 보장)
      userData.roles = roles;
      userData.scopes = scopes;

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: derive pharmacy_owner from organization_members
      const ud = userData as Record<string, unknown>;
      if (ud.pharmacistRole !== 'pharmacy_owner') {
        const [ownerRecord] = await AppDataSource.query(
          `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
          [req.user.id]
        );
        if (ownerRecord) {
          ud.pharmacistRole = 'pharmacy_owner';
        }
      }

      return BaseController.ok(res, { user: userData });
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
      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logged out from all devices',
      });
    } catch (error: any) {
      logger.error('[AuthController.logoutAll] Logout all error', {
        error: error.message,
        userId,
      });

      authenticationService.clearAuthCookies(req, res);

      return BaseController.error(res, 'Failed to logout from all devices');
    }
  }

  /**
   * PATCH /api/v1/auth/me/profile
   * Update pharmacist profile (pharmacistFunction, pharmacistRole)
   *
   * WO-KPA-PHARMACY-GATE-SIMPLIFICATION-V1:
   * FunctionGateModal 선택값을 DB에 영속화
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const { pharmacistFunction, pharmacistRole } = req.body;

    const validFunctions = ['pharmacy', 'hospital', 'industry', 'other'];
    // WO-ROLE-NORMALIZATION-PHASE3-A-V1: pharmacy_owner는 승인 기반만 허용 (셀프 설정 차단)
    const validRoles = ['general', 'hospital', 'other'];

    if (pharmacistFunction && !validFunctions.includes(pharmacistFunction)) {
      return BaseController.error(res, 'Invalid pharmacistFunction', 400);
    }
    if (pharmacistRole && !validRoles.includes(pharmacistRole)) {
      return BaseController.error(res, 'Invalid pharmacistRole', 400);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (pharmacistFunction) {
      updates.push(`pharmacist_function = $${idx++}`);
      params.push(pharmacistFunction);
    }
    if (pharmacistRole) {
      updates.push(`pharmacist_role = $${idx++}`);
      params.push(pharmacistRole);
    }

    if (updates.length === 0) {
      return BaseController.error(res, 'No fields to update', 400);
    }

    try {
      params.push(userId);
      await AppDataSource.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
        params
      );

      return BaseController.ok(res, { pharmacistFunction, pharmacistRole });
    } catch (error: any) {
      logger.error('[AuthController.updateProfile] Update failed', {
        error: error.message,
        userId,
      });
      return BaseController.error(res, 'Failed to update profile');
    }
  }

  /**
   * GET /api/v1/auth/status
   * Check authentication status (public endpoint)
   */
  static async status(req: AuthRequest, res: Response): Promise<any> {
    const authenticated = !!req.user;

    let userData = null;
    if (authenticated && req.user) {
      userData = req.user.toPublicData?.() || req.user;
      // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1: roles 주입
      const roles = deriveRoles(req.user);
      userData.roles = roles;
      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 주입
      const scopes = deriveUserScopes({
        role: req.user.role,
        roles,
      });
      userData.scopes = scopes;

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: derive pharmacy_owner from organization_members
      const ud = userData as Record<string, unknown>;
      if (ud.pharmacistRole !== 'pharmacy_owner') {
        const [ownerRecord] = await AppDataSource.query(
          `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
          [req.user.id]
        );
        if (ownerRecord) {
          ud.pharmacistRole = 'pharmacy_owner';
        }
      }
    }

    return BaseController.ok(res, {
      authenticated,
      user: userData,
    });
  }
}
