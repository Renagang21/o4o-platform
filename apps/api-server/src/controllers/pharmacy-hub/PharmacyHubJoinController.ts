/**
 * PharmacyHubJoinController — Pharmacy-Hub 가입 신청 (Extension Layer)
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-A
 *
 * 정책:
 *   - 가입 write-path 는 공통 Core 경로(AuthRegisterController.register)를 그대로 사용한다.
 *     이 컨트롤러는 serviceKey 강제 + 신청 역할 제한 + 중복 상태 코드 분기만 담당하는 얇은 래퍼다.
 *     (service_memberships 를 직접 INSERT 하지 않는다 — 가입 SSOT 이중화 방지)
 *   - serviceKey 는 항상 서버가 'pharmacy-hub' 로 강제한다. 클라이언트 값은 무시된다.
 *   - status 는 Core 경로가 항상 'pending' 으로 생성한다.
 *   - roleType 은 member(일반 약사 회원) / store_owner(약국 경영자) 둘만 허용한다
 *     (WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1).
 *     operator·admin·강사·커뮤니티 운영자는 자가 신청이 아니라 사후 부여다.
 *     공급자는 Pharmacy-Hub 회원이 아니므로 가입 역할이 아니다
 *     (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
 *   - 두 유형의 차이는 **매장 경영 capability 하나뿐**이다. 일반 약사 회원은 서비스 회원
 *     자격만 가지며(커뮤니티·교육·콘텐츠), 매장 HUB·매장 경영 API 는 store_owner 만 쓴다.
 *     약사 "자격" 은 role 이 아니라 profile 축(kpa_pharmacist_profiles)이며 이 경로에서
 *     추론하지 않는다 — 정본 baseline §4 참조.
 *
 * 중복 신청 (§6-A):
 *   active     → ALREADY_MEMBER
 *   pending    → ALREADY_PENDING
 *   rejected   → ALREADY_REJECTED       (재신청 write 없음 — 운영자 재승인 경로 안내)
 *   suspended  → REACTIVATION_REQUIRED  (기존 재활성 정책 사용)
 *   withdrawn  → REACTIVATION_REQUIRED
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { ServiceMembership } from '../../modules/auth/entities/ServiceMembership.js';
import { AuthRegisterController } from '../../modules/auth/controllers/auth-register.controller.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  PHARMACY_HUB_SIGNUP_ROLES,
  PHARMACY_HUB_SIGNUP_ROLE_LABEL,
  type PharmacyHubSignupRole,
} from '../../constants/pharmacy-hub-signup-roles.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/**
 * 신청 가능한 역할 (§5.2 — operator·admin 제외, 공급자 없음)
 * 목록은 공통 Core 경로와 **같은 SSOT** 를 본다. 사본을 두지 않는다.
 */
const ALLOWED_ROLE_TYPES = PHARMACY_HUB_SIGNUP_ROLES;
type AllowedRoleType = PharmacyHubSignupRole;

const ROLE_LABEL = PHARMACY_HUB_SIGNUP_ROLE_LABEL;

/** 이미 가입 이력이 있는 경우의 응답 (409) */
const DUPLICATE_RESPONSE: Record<string, { code: string; message: string }> = {
  active: {
    code: 'ALREADY_MEMBER',
    message: '이미 파머시 허브 회원입니다. 로그인해 주세요.',
  },
  pending: {
    code: 'ALREADY_PENDING',
    message: '이미 가입 신청이 접수되어 승인 대기 중입니다.',
  },
  rejected: {
    code: 'ALREADY_REJECTED',
    message: '이전 가입 신청이 반려되었습니다. 서비스 운영자에게 재검토를 요청해 주세요.',
  },
  suspended: {
    code: 'REACTIVATION_REQUIRED',
    message: '이용이 정지된 계정입니다. 서비스 운영자에게 재활성화를 요청해 주세요.',
  },
  withdrawn: {
    code: 'REACTIVATION_REQUIRED',
    message: '탈퇴 처리된 계정입니다. 서비스 운영자에게 재활성화를 요청해 주세요.',
  },
};

/**
 * 가입 최소 프로필 (§4.4) — 신규 프로필 테이블 없이 기존 users.businessInfo 축만 사용.
 *
 * WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1:
 *   약국명(businessName)은 **약국 경영자에게만** 요구한다. 일반 약사 회원에게 약국 경영
 *   정보를 요구하면 두 유형을 다시 뒤섞는 것이다(원칙 ②).
 */
function validateMinimalProfile(body: Record<string, any>, roleType: AllowedRoleType): string[] {
  const filled = (v: unknown) => String(v ?? '').trim() !== '';
  const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').length;

  const missing: string[] = [];
  if (!filled(body.name) && !(filled(body.lastName) && filled(body.firstName))) missing.push('name');
  if (digits(body.phone) < 9) missing.push('phone');

  // 약국명 — 기존 businessName 축 재사용 (companyName fallback). 약국 경영자 전용 항목.
  if (roleType === 'store_owner' && !filled(body.businessName) && !filled(body.companyName)) {
    missing.push('businessName');
  }
  return missing;
}

export class PharmacyHubJoinController {
  /**
   * POST /api/v1/pharmacy-hub/join
   * 가입 신청 — 신규 사용자 / 기존 O4O 사용자 모두 동일 경로.
   */
  static async apply(req: Request, res: Response): Promise<any> {
    const body = (req.body ?? {}) as Record<string, any>;
    const roleType = String(body.roleType ?? body.role ?? '');

    if (!ALLOWED_ROLE_TYPES.includes(roleType as AllowedRoleType)) {
      return res.status(400).json({
        success: false,
        error: '가입 신청 역할이 필요합니다. (약사 회원 / 약국 경영자)',
        code: 'PHARMACY_HUB_SIGNUP_ROLE_REQUIRED',
      });
    }

    const email = String(body.email ?? '').trim();
    if (!email) {
      return res.status(400).json({ success: false, error: '이메일이 필요합니다.', code: 'EMAIL_REQUIRED' });
    }

    const missingFields = validateMinimalProfile(body, roleType as AllowedRoleType);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `${ROLE_LABEL[roleType as AllowedRoleType]} 가입 신청에 필요한 정보가 누락되었습니다.`,
        code: 'PHARMACY_HUB_REQUIRED_FIELDS_MISSING',
        missingFields,
      });
    }

    try {
      // 중복 신청 상태 사전 판정 — 상태별 코드 분기를 위해 선조회한다.
      // (Core 경로는 모든 기존 row 를 SERVICE_ALREADY_JOINED 로 묶어 응답한다.)
      const existingUser = await AppDataSource.getRepository(User).findOne({ where: { email } });
      if (existingUser) {
        const membership = await AppDataSource.getRepository(ServiceMembership).findOne({
          where: { userId: existingUser.id, serviceKey: SERVICE_KEY },
        });
        if (membership) {
          const dup = DUPLICATE_RESPONSE[membership.status] ?? DUPLICATE_RESPONSE.active;
          return res.status(409).json({
            success: false,
            error: dup.message,
            code: dup.code,
            data: { status: membership.status },
          });
        }
      }
    } catch (error) {
      logger.error('[PharmacyHubJoin] duplicate pre-check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 처리에 실패했습니다.' });
    }

    // serviceKey / role 은 서버가 강제한다 — 클라이언트가 임의 서비스나 operator 로 신청할 수 없다.
    req.body = {
      ...body,
      service: SERVICE_KEY,
      role: roleType,
      // 약국명은 기존 businessName 축으로 정규화 (신규 프로필 테이블 없음)
      businessName: body.businessName || body.companyName,
      companyName: body.companyName || body.businessName,
    };

    return AuthRegisterController.register(req, res);
  }

  /**
   * GET /api/v1/pharmacy-hub/join/status
   * 내 가입 상태 (requireAuth). 미가입이면 status='none'.
   */
  static async myStatus(req: Request, res: Response): Promise<any> {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
      const rows = await AppDataSource.query(
        `SELECT id, status, role, rejection_reason, approved_at, created_at, updated_at
           FROM service_memberships
          WHERE user_id = $1 AND service_key = $2
          LIMIT 1`,
        [userId, SERVICE_KEY],
      );

      if (rows.length === 0) {
        return res.json({
          success: true,
          data: { serviceKey: SERVICE_KEY, status: 'none', roleType: null, canApply: true },
        });
      }

      const m = rows[0];
      const roleType = String(m.role || '').startsWith(`${SERVICE_KEY}:`)
        ? String(m.role).slice(SERVICE_KEY.length + 1)
        : m.role || null;

      return res.json({
        success: true,
        data: {
          serviceKey: SERVICE_KEY,
          membershipId: m.id,
          status: m.status,
          roleType,
          role: m.role,
          rejectionReason: m.rejection_reason ?? null,
          appliedAt: m.created_at,
          approvedAt: m.approved_at ?? null,
          updatedAt: m.updated_at,
          canApply: false,
          // 반려 후 재신청은 write 경로가 아니라 운영자 재승인 경로를 사용한다 (§6-A).
          canReapply: false,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubJoin] myStatus failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 상태 조회에 실패했습니다.' });
    }
  }
}
