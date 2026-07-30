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
 *   - roleType 은 store_owner / supplier 만 허용한다 (§5.2). operator 자가 신청 불가.
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
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/** 신청 가능한 역할 (§5.2 — operator 제외) */
const ALLOWED_ROLE_TYPES = ['store_owner', 'supplier'] as const;
type AllowedRoleType = (typeof ALLOWED_ROLE_TYPES)[number];

const ROLE_LABEL: Record<AllowedRoleType, string> = {
  store_owner: '약국 경영자',
  supplier: '공급자',
};

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

/** 역할별 최소 프로필 (§4.4) — 신규 프로필 테이블 없이 기존 users.businessInfo 축만 사용 */
function validateMinimalProfile(roleType: AllowedRoleType, body: Record<string, any>): string[] {
  const filled = (v: unknown) => String(v ?? '').trim() !== '';
  const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').length;

  const missing: string[] = [];
  if (!filled(body.name) && !(filled(body.lastName) && filled(body.firstName))) missing.push('name');
  if (digits(body.phone) < 9) missing.push('phone');

  if (roleType === 'store_owner') {
    // 약국명 — 기존 businessName 축 재사용 (companyName fallback)
    if (!filled(body.businessName) && !filled(body.companyName)) missing.push('businessName');
  } else {
    // 공급자: 회사명 + 담당자명
    if (!filled(body.companyName) && !filled(body.businessName)) missing.push('companyName');
    if (!filled(body.contactName)) missing.push('contactName');
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
        error: '가입 신청 역할이 필요합니다. (약국 경영자 / 공급자)',
        code: 'PHARMACY_HUB_SIGNUP_ROLE_REQUIRED',
      });
    }

    const email = String(body.email ?? '').trim();
    if (!email) {
      return res.status(400).json({ success: false, error: '이메일이 필요합니다.', code: 'EMAIL_REQUIRED' });
    }

    const missingFields = validateMinimalProfile(roleType as AllowedRoleType, body);
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
