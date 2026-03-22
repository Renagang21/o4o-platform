/**
 * @core O4O_PLATFORM_CORE — Auth
 * Core Controller: login, register, refresh, logout
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePassword } from '../../../utils/auth.utils.js';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { AppDataSource } from '../../../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { ServiceMembership } from '../entities/ServiceMembership.js';
import { LoginRequestDto, RegisterRequestDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { env } from '../../../utils/env-validator.js';
import { deriveUserScopes } from '../../../utils/scope-assignment.utils.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import { getServiceName } from '../../../config/service-catalog.js';
import { RedisService } from '../../../services/redis.service.js';
import { monitoringMetrics } from '../../../common/monitoring/metrics.service.js';

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
 * WO-ROLE-NORMALIZATION-PHASE3-B-V1
 * organization_members + kpa_pharmacist_profiles에서 약사 자격 derive.
 * users.pharmacist_role / pharmacist_function 컬럼 제거 후 대체 로직.
 */
async function derivePharmacistQualification(userId: string): Promise<{
  pharmacistRole: string | null;
  pharmacistFunction: string | null;
  isStoreOwner: boolean;
}> {
  // 1. Check organization_members for owner status (table may not exist in production)
  let isStoreOwner = false;
  try {
    const [ownerRecord] = await AppDataSource.query(
      `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
      [userId]
    );
    isStoreOwner = !!ownerRecord;
  } catch { /* table may not exist */ }

  // 2. Query kpa_pharmacist_profiles for activity_type
  const [profile] = await AppDataSource.query(
    `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  // 3. Derive pharmacistRole (backward compatible)
  // WO-O4O-KPA-A-ACTIVITY-TYPE-NORMALIZATION-V1:
  //   isStoreOwner → 'pharmacy_owner', otherwise activityType 기반 단순 분기
  let pharmacistRole: string | null = null;
  if (isStoreOwner) {
    pharmacistRole = 'pharmacy_owner';
  } else if (profile?.activity_type) {
    pharmacistRole = profile.activity_type === 'pharmacy_owner'
      ? 'pharmacy_owner'
      : 'general';
  }

  // 4. pharmacistFunction = activityType 직통 (SSOT 정합성)
  // WO-O4O-KPA-A-ACTIVITY-TYPE-NORMALIZATION-V1:
  //   기존 lossy mapping 제거 (manufacturer→industry 등 불일치 해소)
  //   activityType이 유일한 기준, pharmacistFunction은 API 호환 필드
  const pharmacistFunction: string | null = profile?.activity_type || null;

  return { pharmacistRole, pharmacistFunction, isStoreOwner };
}

/**
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1
 * KPA 회원 + 조직 소속 정보를 단일 컨텍스트로 derive.
 * /auth/me 응답에 kpaMembership 필드로 포함.
 */
interface KpaMembershipContext {
  status: string | null;           // kpa_members.status
  role: string | null;             // kpa_members.role
  membershipType: string | null;   // kpa_members.membership_type (pharmacist | student)
  organizationId: string | null;   // kpa_members.organization_id
  organizationName: string | null;
  organizationType: string | null;
  organizationRole: string | null; // organization_members.role (있는 경우)
  serviceAccess: 'full' | 'community-only' | 'pending' | 'blocked' | null;
}

async function deriveKpaMembershipContext(userId: string): Promise<KpaMembershipContext | null> {
  // 1. kpa_members 조회
  const [member] = await AppDataSource.query(
    `SELECT m.status, m.role, m.membership_type, m.organization_id,
            o.name AS org_name, o.type AS org_type
     FROM kpa_members m
     LEFT JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (!member) return null;

  // 2. organization_members 조회 (활성 소속, table may not exist)
  let orgMember = null;
  try {
    const [row] = await AppDataSource.query(
      `SELECT role FROM organization_members
       WHERE user_id = $1 AND left_at IS NULL
       LIMIT 1`,
      [userId]
    );
    orgMember = row || null;
  } catch { /* table may not exist */ }

  // 3. serviceAccess 매트릭스 계산
  let serviceAccess: KpaMembershipContext['serviceAccess'] = null;
  if (member.status === 'pending') {
    serviceAccess = 'pending';
  } else if (member.status === 'suspended' || member.status === 'withdrawn') {
    serviceAccess = 'blocked';
  } else if (member.status === 'active') {
    serviceAccess = orgMember ? 'full' : 'community-only';
  }

  return {
    status: member.status,
    role: member.role,
    membershipType: member.membership_type || null,
    organizationId: member.organization_id || null,
    organizationName: member.org_name || null,
    organizationType: member.org_type || null,
    organizationRole: orgMember?.role || null,
    serviceAccess,
  };
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

      // Enrich user data with activityType + kpaMembership (same as /auth/me)
      const loginUser = result.user as Record<string, unknown>;
      try {
        const qualification = await derivePharmacistQualification(result.user.id);
        loginUser.pharmacistRole = qualification.pharmacistRole;
        loginUser.pharmacistFunction = qualification.pharmacistFunction;
        loginUser.isStoreOwner = qualification.isStoreOwner;
      } catch { /* non-critical */ }
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [result.user.id]
        );
        loginUser.activityType = profile?.activity_type || null;
      } catch { loginUser.activityType = null; }
      try {
        const kpaMembership = await deriveKpaMembershipContext(result.user.id);
        loginUser.kpaMembership = kpaMembership;
      } catch { /* non-critical */ }

      // WO-O4O-NAME-NORMALIZATION-V1: displayName 추가
      loginUser.displayName =
        (result.user.lastName || result.user.firstName)
          ? `${result.user.lastName || ''}${result.user.firstName || ''}`.trim()
          : result.user.name || result.user.email?.split('@')[0] || '사용자';

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

      // WO-O4O-MONITORING-IMPLEMENTATION-V1: Auth failure metric
      monitoringMetrics.recordAuthFailure(error.code || 'UNKNOWN');

      // Handle specific auth errors with specific error codes
      if (error.code === 'INVALID_CREDENTIALS') {
        // WO-O4O-AUTH-PASSWORD-SYNC-V1: Issue syncToken for password reset flow
        try {
          const syncToken = uuidv4();
          const redis = RedisService.getInstance();
          await redis.set(
            `password-sync:${syncToken}`,
            JSON.stringify({ email, createdAt: Date.now() }),
            300, // 5 minutes TTL
          );
          return res.status(401).json({
            success: false,
            error: '비밀번호가 일치하지 않습니다.',
            code: 'PASSWORD_MISMATCH',
            passwordSyncAvailable: true,
            syncToken,
          });
        } catch (syncErr) {
          logger.warn('[AuthController.login] Failed to generate syncToken', syncErr);
          return BaseController.unauthorized(res, error.message, 'PASSWORD_MISMATCH');
        }
      }
      if (error.code === 'INVALID_USER') {
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
      // Check password confirmation (optional: some frontends validate client-side only)
      if (data.passwordConfirm && data.password !== data.passwordConfirm) {
        return BaseController.error(res, 'Passwords do not match', 400);
      }

      // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Normalize consent fields
      // KPA/GlycoPharm use tos/privacyAccepted/marketingAccepted
      // Neture/K-Cosmetics use agreeTerms/agreePrivacy/agreeMarketing
      const tosAccepted = data.tos === true || data.agreeTerms === true;
      const privacyAccepted = data.privacyAccepted === true || data.agreePrivacy === true;
      const marketingAccepted = data.marketingAccepted === true || data.agreeMarketing === true;

      if (!tosAccepted) {
        return BaseController.error(res, 'Terms of service must be accepted', 400);
      }

      const userRepository = AppDataSource.getRepository(User);
      const smRepository = AppDataSource.getRepository(ServiceMembership);

      // Phase 3: membershipType에 따라 role 분기
      const VALID_ROLES = ['super_admin', 'admin', 'vendor', 'seller', 'user', 'business', 'partner', 'supplier', 'manager', 'customer'];
      const rawRole = data.membershipType === 'student'
        ? 'user'
        : (data.role || 'customer');
      const effectiveRole = VALID_ROLES.includes(rawRole) ? rawRole : 'user';
      const serviceKey = data.service || 'platform';

      // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Name normalization
      let resolvedName: string;
      let resolvedLastName: string | undefined;
      let resolvedFirstName: string | undefined;
      if (data.lastName && data.firstName) {
        resolvedName = `${data.lastName}${data.firstName}`;
        resolvedLastName = data.lastName;
        resolvedFirstName = data.firstName;
      } else if (data.name) {
        resolvedName = data.name;
      } else {
        return BaseController.error(res, 'Name is required (provide name or lastName+firstName)', 400);
      }

      // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1: Check existing user
      const existingUser = await userRepository.findOne({ where: { email: data.email } });

      if (existingUser) {
        // ── 기존 사용자: 서비스 멤버십 추가 플로우 ──

        // 1. 해당 서비스 멤버십 확인
        const existingMembership = await smRepository.findOne({
          where: { userId: existingUser.id, serviceKey },
        });
        if (existingMembership) {
          return BaseController.error(res, '이미 해당 서비스에 가입된 계정입니다. 로그인해 주세요.', 409,
            'SERVICE_ALREADY_JOINED');
        }

        // 2. 비밀번호 검증 (보안: 본인 확인)
        const passwordMatch = await comparePassword(data.password, existingUser.password);
        if (!passwordMatch) {
          // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: 기존 가입 서비스 목록 포함
          const existingMemberships = await smRepository.find({
            where: { userId: existingUser.id },
            select: ['serviceKey', 'status'],
          });
          return res.status(401).json({
            success: false,
            error: 'O4O 플랫폼에 이미 가입된 계정입니다. 기존 비밀번호를 입력해주세요.',
            code: 'PASSWORD_MISMATCH',
            existingAccount: true,
            services: existingMemberships.map(m => ({ key: m.serviceKey, name: getServiceName(m.serviceKey), status: m.status })),
          });
        }

        // 3. 새 서비스 멤버십 추가 (트랜잭션)
        // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: RoleAssignment는 서비스 승인 시에만 생성
        await AppDataSource.transaction(async (manager) => {
          // ServiceMembership 생성
          const txSmRepo = manager.getRepository(ServiceMembership);
          const membership = new ServiceMembership();
          membership.userId = existingUser.id;
          membership.serviceKey = serviceKey;
          membership.status = 'pending';
          membership.role = effectiveRole;
          await txSmRepo.save(membership);

          // WO-O4O-GLYCOPHARM-SIGNUP-REFORM-V1: businessInfo 머지 (기존 정보 보존 + 신규 추가)
          const newBiz: Record<string, string> = {};
          const effectiveBusinessName = data.businessName || data.companyName;
          if (effectiveBusinessName) newBiz.businessName = effectiveBusinessName;
          if (data.businessNumber) newBiz.businessNumber = data.businessNumber;
          if (data.businessType) newBiz.businessType = data.businessType;
          if (data.taxEmail) newBiz.email = data.taxEmail;
          if (data.businessCategory) newBiz.businessCategory = data.businessCategory;
          if (data.address1) newBiz.address = data.address1;
          if (data.address2) newBiz.address2 = data.address2;
          if (Object.keys(newBiz).length > 0) {
            const merged = { ...(existingUser.businessInfo || {}), ...newBiz };
            await manager.query(
              `UPDATE users SET "businessInfo" = $1 WHERE id = $2`,
              [JSON.stringify(merged), existingUser.id]
            );
          }

          // KPA Society: auto-create KPA member
          await AuthController.createKpaRecords(manager, existingUser.id, data);
        });

        logger.info('[AuthController.register] Service membership added to existing user', {
          userId: existingUser.id,
          serviceKey,
          role: effectiveRole,
        });

        return BaseController.created(res, {
          message: '서비스 가입 신청이 완료되었습니다. 승인을 기다려주세요.',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            status: 'pending',
          },
          existingAccount: true,
          pendingApproval: true,
        });
      }

      // ── 신규 사용자: 기존 로직 + ServiceMembership 추가 ──
      const hashedPassword = await hashPassword(data.password);

      const user = await AppDataSource.transaction(async (manager) => {
        const txUserRepo = manager.getRepository(User);

        // Create new user
        const newUser = new User();
        newUser.email = data.email;
        newUser.password = hashedPassword;
        newUser.name = resolvedName;
        newUser.lastName = resolvedLastName;
        newUser.firstName = resolvedFirstName;
        newUser.nickname = data.nickname || resolvedName;

        // role column removed - Phase3-E: roles is populated from role_assignments
        // WO-O4O-USER-DOMAIN-FINALIZATION-V1: users.service_key deprecated — SSOT is service_memberships
        // newUser.serviceKey = serviceKey; // REMOVED — written to service_memberships below
        if (data.phone) {
          newUser.phone = data.phone.replace(/\D/g, '');
        }

        // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Consent timestamps
        newUser.tosAcceptedAt = tosAccepted ? new Date() : undefined;
        newUser.privacyAcceptedAt = privacyAccepted ? new Date() : undefined;
        newUser.marketingAccepted = marketingAccepted;

        // businessInfo: 사업자 정보 + 면허번호 저장
        const effectiveBusinessName = data.businessName || data.companyName;
        const businessInfo: Record<string, string> = {};
        if (data.licenseNumber) {
          businessInfo.licenseNumber = data.licenseNumber;
        }
        if (effectiveBusinessName) {
          businessInfo.businessName = effectiveBusinessName;
        }
        if (data.businessNumber) {
          businessInfo.businessNumber = data.businessNumber;
        }
        if (data.businessType) {
          businessInfo.businessType = data.businessType;
        }
        if (data.taxEmail) {
          businessInfo.email = data.taxEmail;
        }
        if (data.businessCategory) {
          businessInfo.businessCategory = data.businessCategory;
        }
        if (data.address1) {
          businessInfo.address = data.address1;
        }
        if (data.address2) {
          businessInfo.address2 = data.address2;
        }
        // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 dual write
        if (data.address1) {
          (businessInfo as any).storeAddress = {
            baseAddress: data.address1,
            ...(data.address2 ? { detailAddress: data.address2 } : {}),
          };
        }
        if (Object.keys(businessInfo).length > 0) {
          newUser.businessInfo = businessInfo;
        }

        await txUserRepo.save(newUser);

        // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1: ServiceMembership 생성
        const txSmRepo = manager.getRepository(ServiceMembership);
        const membership = new ServiceMembership();
        membership.userId = newUser.id;
        membership.serviceKey = serviceKey;
        membership.status = 'pending';
        membership.role = effectiveRole;
        await txSmRepo.save(membership);

        // KPA Society: auto-create KPA member
        await AuthController.createKpaRecords(manager, newUser.id, data);

        // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: RoleAssignment는 서비스 승인 시에만 생성

        return newUser;
      });

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
        if (detail.includes('service_key')) {
          return BaseController.error(res, '이미 해당 서비스에 가입된 계정입니다.', 409,
            'SERVICE_ALREADY_JOINED');
        }
        return BaseController.error(res, 'Registration conflict', 409);
      }

      return BaseController.error(res, 'Registration failed');
    }
  }

  /**
   * POST /api/v1/auth/check-email
   * WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: 이메일 사전 확인 (멀티 서비스 가입 UX)
   */
  static async checkEmail(req: Request, res: Response): Promise<any> {
    const { email, service } = req.body;
    if (!email) {
      return BaseController.error(res, 'Email is required', 400);
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const smRepo = AppDataSource.getRepository(ServiceMembership);

      const existingUser = await userRepo.findOne({ where: { email } });
      if (!existingUser) {
        return BaseController.ok(res, { exists: false });
      }

      // 이미 해당 서비스에 가입되어 있는지 확인
      const currentMembership = service
        ? await smRepo.findOne({ where: { userId: existingUser.id, serviceKey: service } })
        : null;

      // 가입된 서비스 목록 조회
      const memberships = await smRepo.find({
        where: { userId: existingUser.id },
        select: ['serviceKey', 'status'],
      });

      return BaseController.ok(res, {
        exists: true,
        alreadyJoined: !!currentMembership,
        services: memberships.map(m => ({ key: m.serviceKey, name: getServiceName(m.serviceKey), status: m.status })),
      });
    } catch (error) {
      logger.error('[AuthController.checkEmail] Error', { error });
      return BaseController.error(res, 'Email check failed');
    }
  }

  /**
   * KPA-specific record creation (extracted for reuse in both new-user and existing-user flows)
   */
  private static async createKpaRecords(
    manager: import('typeorm').EntityManager,
    userId: string,
    data: RegisterRequestDto,
  ): Promise<void> {
    // KPA Society: auto-create KPA member (pharmacist with org, or student without org)
    if (data.service === 'kpa-society' && (data.organizationId || data.membershipType === 'student')) {
      const licenseNum = data.membershipType === 'pharmacist' ? (data.licenseNumber || null) : null;

      const memberResult = await manager.query(`
        INSERT INTO kpa_members (user_id, organization_id, membership_type, license_number, university_name, role, status, identity_status)
        VALUES ($1, $2, $3, $4, $5, 'member', 'pending', 'active')
        ON CONFLICT (user_id) DO NOTHING
        RETURNING id
      `, [
        userId,
        data.organizationId || null,
        data.membershipType || 'pharmacist',
        licenseNum,
        data.membershipType === 'student' ? (data.universityName || null) : null,
      ]);

      // 서비스별 승인 레코드 생성 (kpa-a: 커뮤니티)
      if (memberResult[0]?.id) {
        await manager.query(`
          INSERT INTO kpa_member_services (member_id, service_key, status)
          VALUES ($1, 'kpa-a', 'pending')
          ON CONFLICT (member_id, service_key) DO NOTHING
        `, [memberResult[0].id]);
      }
    }

    // WO-ROLE-NORMALIZATION-PHASE3-B-V1: create kpa_pharmacist_profiles record
    if (data.service === 'kpa-society' && (data.pharmacistFunction || data.licenseNumber)) {
      const functionToActivity: Record<string, string> = {
        pharmacy: 'pharmacy_employee', hospital: 'hospital',
        industry: 'other_industry', other: 'other',
      };
      await manager.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
         VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          data.licenseNumber || null,
          data.pharmacistFunction ? (functionToActivity[data.pharmacistFunction] || 'other') : null,
        ]
      );
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

      // WO-O4O-MONITORING-IMPLEMENTATION-V1: Auth failure metric
      monitoringMetrics.recordAuthFailure(error.code || 'REFRESH_TOKEN_INVALID');

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
      // Phase3-E: roles from JWT payload (set at login from role_assignments)
      const roles = req.user.roles || [];

      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 계산
      const scopes = deriveUserScopes({
        role: roles[0] || 'user',
        roles,
      });

      const userData = req.user.toPublicData?.() || {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: roles[0] || 'user',
        roles,  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1
        status: req.user.status,
        scopes: [] as string[],
      };

      // roles / scopes 주입 (toPublicData 이미 roles 포함하지만 일관성 보장)
      userData.roles = roles;
      userData.scopes = scopes;

      // WO-O4O-NAME-NORMALIZATION-V1: firstName, lastName, displayName 추가
      const ud0 = userData as Record<string, unknown>;
      ud0.firstName = req.user.firstName || null;
      ud0.lastName = req.user.lastName || null;
      ud0.displayName =
        (req.user.lastName || req.user.firstName)
          ? `${req.user.lastName || ''}${req.user.firstName || ''}`.trim()
          : req.user.name || req.user.email?.split('@')[0] || '사용자';

      // WO-ROLE-NORMALIZATION-PHASE3-B-V1: derive from kpa_pharmacist_profiles + organization_members
      const qualification = await derivePharmacistQualification(req.user.id);
      const ud = userData as Record<string, unknown>;
      ud.pharmacistRole = qualification.pharmacistRole;
      ud.pharmacistFunction = qualification.pharmacistFunction;
      ud.isStoreOwner = qualification.isStoreOwner;

      // activityType from kpa_pharmacist_profiles (required for setup-activity gate)
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [req.user.id]
        );
        ud.activityType = profile?.activity_type || null;
      } catch { ud.activityType = null; }

      // WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: KPA membership context 통합
      const kpaMembership = await deriveKpaMembershipContext(req.user.id);
      ud.kpaMembership = kpaMembership;

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
      try {
        ud.memberships = await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [req.user.id]
        );
      } catch { ud.memberships = []; }

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
   * Update pharmacist profile (pharmacistFunction)
   *
   * WO-ROLE-NORMALIZATION-PHASE3-B-V1:
   * kpa_pharmacist_profiles에 UPSERT (users 테이블 대신)
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    // WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1:
    // activityType 직접 수용 (프론트 계약) + pharmacistFunction 하위 호환
    const { pharmacistFunction, activityType: rawActivityType } = req.body;

    const validActivityTypes = [
      'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
      'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
    ];
    const functionToActivity: Record<string, string> = {
      pharmacy: 'pharmacy_employee', hospital: 'hospital',
      industry: 'other_industry', other: 'other',
    };

    // activityType 직접 전송 우선, pharmacistFunction 레거시 매핑 폴백
    let resolvedActivityType: string | null = null;
    if (rawActivityType && validActivityTypes.includes(rawActivityType)) {
      resolvedActivityType = rawActivityType;
    } else if (pharmacistFunction && functionToActivity[pharmacistFunction]) {
      resolvedActivityType = functionToActivity[pharmacistFunction];
    }

    if (!resolvedActivityType) {
      return BaseController.error(res, 'No fields to update', 400);
    }

    try {
      // 1. SSOT: kpa_pharmacist_profiles
      await AppDataSource.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
        [userId, resolvedActivityType]
      );

      // 2. Mirror: kpa_members.activity_type (denormalized sync)
      await AppDataSource.query(
        `UPDATE kpa_members SET activity_type = $2 WHERE user_id = $1`,
        [userId, resolvedActivityType]
      );

      const qualification = await derivePharmacistQualification(userId);
      return BaseController.ok(res, {
        pharmacistFunction: qualification.pharmacistFunction,
        pharmacistRole: qualification.pharmacistRole,
        isStoreOwner: qualification.isStoreOwner,
        activityType: resolvedActivityType,
      });
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
      // Phase3-E: Fresh RA query for current roles on status check
      const roles = await roleAssignmentService.getRoleNames(req.user.id);
      userData.roles = roles;
      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 주입
      const scopes = deriveUserScopes({
        role: roles[0] || 'user',
        roles,
      });
      userData.scopes = scopes;

      // WO-ROLE-NORMALIZATION-PHASE3-B-V1: derive from kpa_pharmacist_profiles + organization_members
      const qualification = await derivePharmacistQualification(req.user.id);
      const ud = userData as Record<string, unknown>;
      ud.pharmacistRole = qualification.pharmacistRole;
      ud.pharmacistFunction = qualification.pharmacistFunction;
      ud.isStoreOwner = qualification.isStoreOwner;

      // activityType from kpa_pharmacist_profiles (required for setup-activity gate)
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [req.user.id]
        );
        ud.activityType = profile?.activity_type || null;
      } catch { ud.activityType = null; }

      // kpaMembership context (required for membershipType on frontend)
      ud.kpaMembership = await deriveKpaMembershipContext(req.user.id);

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
      try {
        ud.memberships = await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [req.user.id]
        );
      } catch { ud.memberships = []; }
    }

    return BaseController.ok(res, {
      authenticated,
      user: userData,
    });
  }
}
