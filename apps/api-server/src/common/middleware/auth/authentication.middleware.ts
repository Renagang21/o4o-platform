/**
 * Authentication Middleware — Platform User Authentication
 *
 * Extracted from auth.middleware.ts (WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1)
 * Contains: requireAuth, optionalAuth, requirePlatformUser, compat aliases
 */
import { Response, NextFunction } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../../modules/auth/entities/User.js';
import { verifyAccessToken, isServiceToken } from '../../../utils/token.utils.js';
import logger from '../../../utils/logger.js';
import { AuthRequest, extractToken } from './auth-context.helpers.js';
import {
  ACCOUNT_ACCESS_RESTRICTED_CODE,
  ACCOUNT_ACCESS_RESTRICTED_MESSAGE,
  isRestrictedRequestAllowed,
  resolveAccountAccess,
  type AccountAccess,
} from '../../auth/account-access.policy.js';

/**
 * WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-B — 중앙 제한 접근 가드
 *
 * 적용 지점을 requireAuth 내부로 둔 이유:
 *   api-server 는 `/api/v1` 단일 마운트가 아니라 라우터별 마운트 구조라
 *   `app.use('/api/v1', guard)` 로 전 인증 경계를 덮을 수 없다.
 *   반면 인증된 요청은 예외 없이 requireAuth / requirePlatformUser 를 통과하고
 *   (req.user 대입 지점이 이 파일 외에는 dev-auth·home-preview 뿐),
 *   requireAuth 는 매 요청 users 를 재조회하므로 **DB status 기준 판정**이 가능하다.
 *   → 라우트 278개 개별 수정 없이 default-deny 를 단일 지점에서 강제한다.
 *
 * 판정 SSOT 는 DB `users.status` 다. JWT claim(accountAccess)은 프론트 힌트일 뿐이고
 * 서버 판정에 사용하지 않으므로, claim 이 없는 기존 토큰도 정상 동작한다 (§7.3 / §10-⑦).
 *
 * @returns 응답을 이미 보냈으면 true (호출측은 즉시 return)
 */
function enforceAccountAccess(req: AuthRequest, res: Response, user: { id: string; status: unknown }): boolean {
  const decision = resolveAccountAccess(user.status);

  if (decision === 'blocked') {
    logger.warn('[accountAccess] blocked account rejected', {
      userId: user.id,
      status: String(user.status),
      path: req.originalUrl,
      method: req.method,
    });
    res.status(403).json({
      success: false,
      error: '이용할 수 없는 계정 상태입니다.',
      code: 'ACCOUNT_NOT_ACTIVE',
    });
    return true;
  }

  if (decision === 'restricted' && !isRestrictedRequestAllowed(req.method, req.originalUrl)) {
    logger.warn('[accountAccess] restricted account denied', {
      userId: user.id,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(403).json({
      success: false,
      error: ACCOUNT_ACCESS_RESTRICTED_MESSAGE,
      code: ACCOUNT_ACCESS_RESTRICTED_CODE,
    });
    return true;
  }

  (req as AuthRequest & { accountAccess?: AccountAccess }).accountAccess = decision;
  return false;
}

/**
 * Require Authentication Middleware
 *
 * === Phase 2.5: Server Isolation & Unified Error Handling ===
 * Uses token.utils.verifyAccessToken which includes:
 * - JWT signature verification
 * - Issuer/Audience validation (server isolation)
 * - Expiration check
 *
 * Returns 401 if:
 * - No token provided (AUTH_REQUIRED)
 * - Token is invalid, expired, or from different server (INVALID_TOKEN)
 * - User not found in database (INVALID_USER)
 * - User account is inactive (USER_INACTIVE)
 *
 * @example
 * ```typescript
 * router.get('/profile', requireAuth, UserController.getProfile);
 * ```
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 2.5: Use token.utils for verification (includes issuer/audience check)
    const payload = verifyAccessToken(token);

    if (!payload) {
      // Token is invalid, expired, or from a different server
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: ['linkedAccounts'],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been deactivated',
        code: 'INVALID_USER',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
    }

    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1: 중앙 default-deny
    if (enforceAccountAccess(req, res, user)) return;

    // Phase3-E: Assign roles from JWT payload (set at login from role_assignments table)
    user.roles = payload.roles || [];
    // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Assign memberships from JWT payload
    user.memberships = (payload as any).memberships || [];

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('[requireAuth] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Optional Authentication Middleware
 *
 * === Phase 2.5: Server Isolation ===
 * Uses token.utils.verifyAccessToken for consistent token validation.
 * Tokens from different servers will be silently rejected.
 *
 * Attempts to authenticate the user but doesn't fail if no token is present.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/products', optionalAuth, ProductController.list);
 * // Inside controller: if (req.user) { ... show personalized data ... }
 * ```
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // No token, continue without authentication
    }

    // Phase 2.5: Use token.utils for verification (includes issuer/audience check)
    const payload = verifyAccessToken(token);

    if (!payload) {
      return next(); // Invalid token, continue without authentication
    }

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: ['linkedAccounts'],
    });

    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1:
    //   optionalAuth 는 비로그인도 통과하는 공개 경로용이다. 제한/차단 계정은
    //   403 을 내는 대신 **비로그인과 동일하게 취급**한다 (개인화·본인 스코프 write 차단).
    //   허용 경로(/auth/status)는 아래 attach 를 통해 정상 동작한다.
    const optionalAccess = user ? resolveAccountAccess(user.status) : 'blocked';
    const optionalAllowed =
      optionalAccess === 'normal' ||
      (optionalAccess === 'restricted' && isRestrictedRequestAllowed(req.method, req.originalUrl));

    if (user && user.isActive && optionalAllowed) {
      // Phase3-E: Assign roles from JWT payload
      user.roles = payload.roles || [];
      (req as AuthRequest & { accountAccess?: AccountAccess }).accountAccess = optionalAccess as AccountAccess;
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Require Platform User Authentication
 *
 * Similar to requireAuth but explicitly rejects Service User tokens.
 * Use this for Admin/Operator APIs that should NEVER be accessible
 * by Service Users.
 *
 * Returns 403 if token is a Service User token.
 *
 * @example
 * ```typescript
 * router.delete('/admin/users/:id', requirePlatformUser, AdminController.deleteUser);
 * ```
 */
export const requirePlatformUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 1: Check token type - reject Service tokens
    if (isServiceToken(token)) {
      logger.warn('[requirePlatformUser] Service token rejected for platform-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Platform user authentication required. Service tokens are not allowed.',
        code: 'SERVICE_TOKEN_NOT_ALLOWED',
      });
    }

    // Continue with standard platform user auth
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: ['linkedAccounts'],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been deactivated',
        code: 'INVALID_USER',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
    }

    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1: 중앙 default-deny
    if (enforceAccountAccess(req, res, user)) return;

    // Phase3-E: Assign roles from JWT payload
    user.roles = payload.roles || [];

    req.user = user;
    next();
  } catch (error) {
    logger.error('[requirePlatformUser] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Backwards compatibility aliases
 */
export const authenticate = requireAuth;
export const authenticateToken = requireAuth;
export const authenticateCookie = requireAuth;
