/**
 * BranchJoinController — 분회 서비스 가입 신청 (Extension Layer)
 *
 * WO-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1
 *
 * 정책:
 *   - 가입 write-path 는 공통 Core 경로(AuthRegisterController.register)를 그대로 사용한다.
 *     이 컨트롤러는 serviceKey 강제 + 중복 상태 코드 분기만 담당하는 얇은 래퍼다
 *     (pharmacy-hub 선례). service_memberships / service_credentials 를 직접 INSERT 하지 않는다.
 *   - Core 경로가 단일 트랜잭션에서 service_memberships(pending) + service_credentials 를 함께 만든다.
 *     → kpa-branch 로그인은 users.password fallback 이 아니라 자기 서비스 credential 로 검증된다.
 *   - serviceKey 는 항상 서버가 'kpa-branch' 로 강제한다. 클라이언트 값은 무시된다.
 *   - 신청 역할은 회원(member) 뿐이다. operator/admin 은 자가 신청 경로가 없다.
 *
 * 4축 분리 (혼합 금지):
 *   users(Identity) / service_memberships(서비스 접근) / service_credentials(서비스 비밀번호)
 *   / branch_memberships(분회 소속). 이 컨트롤러는 앞의 세 축만 다루고 분회 소속은 만들지 않는다.
 *   분회 소속은 분회 운영자 경로(BranchMemberController.join)에서만 생성된다.
 *
 * 약사 profile (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1):
 *   - `licenseNumber` / `activityType` 를 받는다. 신규 사용자는 core 가 `users.businessInfo.licenseNumber`
 *     에 남기지만 기존 사용자 경로는 남기지 않으므로, 가입 성공 직후 **Extension 경계에서**
 *     `kpa_pharmacist_profiles` 를 만들거나 비어 있는 값만 채운다 (PharmacistProfilePromotionService).
 *   - 기존 profile 은 보존하고, 면허번호가 다른 사용자 것이면 자동 overwrite 하지 않는다.
 *   - auth-core / createKpaRecords 는 수정하지 않았다. `kpa_members` 에는 쓰지 않는다.
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { ServiceMembership } from '../../modules/auth/entities/ServiceMembership.js';
import { AuthRegisterController } from '../../modules/auth/controllers/auth-register.controller.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';
import {
  PharmacistProfilePromotionService,
  KPA_ACTIVITY_TYPES,
  LICENSE_NUMBER_MAX,
} from '../../services/kpa-branch/PharmacistProfilePromotionService.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;

/** 이미 가입 이력이 있는 경우의 응답 (409) */
const DUPLICATE_RESPONSE: Record<string, { code: string; message: string }> = {
  active: { code: 'ALREADY_MEMBER', message: '이미 분회 서비스 회원입니다. 로그인해 주세요.' },
  pending: { code: 'ALREADY_PENDING', message: '이미 가입 신청이 접수되어 승인 대기 중입니다.' },
  rejected: {
    code: 'ALREADY_REJECTED',
    message: '이전 가입 신청이 반려되었습니다. 분회 서비스 운영자에게 재검토를 요청해 주세요.',
  },
  suspended: {
    code: 'REACTIVATION_REQUIRED',
    message: '이용이 정지된 계정입니다. 분회 서비스 운영자에게 재활성화를 요청해 주세요.',
  },
  withdrawn: {
    code: 'REACTIVATION_REQUIRED',
    message: '탈퇴 처리된 계정입니다. 분회 서비스 운영자에게 재활성화를 요청해 주세요.',
  },
};

export class BranchJoinController {
  /**
   * POST /api/v1/kpa-branch/join
   * 가입 신청 — 신규 사용자 / 기존 O4O 사용자 모두 동일 경로.
   * 기존 사용자는 Core 경로가 users.password 를 건드리지 않고 kpa-branch credential 만 새로 만든다.
   */
  static async apply(req: Request, res: Response): Promise<any> {
    const body = (req.body ?? {}) as Record<string, any>;

    const email = String(body.email ?? '').trim();
    if (!email) {
      return res.status(400).json({ success: false, error: '이메일이 필요합니다.', code: 'EMAIL_REQUIRED' });
    }

    const hasName = String(body.name ?? '').trim() !== ''
      || (String(body.lastName ?? '').trim() !== '' && String(body.firstName ?? '').trim() !== '');
    if (!hasName) {
      return res.status(400).json({ success: false, error: '이름이 필요합니다.', code: 'NAME_REQUIRED' });
    }

    // 면허번호·직역 — 선택 입력이지만 형식은 여기서 확정한다 (profile 컬럼 한도·코드계)
    const licenseNumber = body.licenseNumber === undefined || body.licenseNumber === null
      ? null
      : String(body.licenseNumber).trim();
    if (licenseNumber !== null && licenseNumber.length > LICENSE_NUMBER_MAX) {
      return res.status(422).json({
        success: false, error: `면허번호는 ${LICENSE_NUMBER_MAX}자 이내여야 합니다.`, code: 'LICENSE_NUMBER_INVALID',
      });
    }
    const activityType = typeof body.activityType === 'string' && body.activityType.trim() !== ''
      ? body.activityType.trim()
      : null;
    if (activityType !== null && !KPA_ACTIVITY_TYPES.has(activityType)) {
      return res.status(422).json({ success: false, error: '직역 구분이 올바르지 않습니다.', code: 'ACTIVITY_TYPE_INVALID' });
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
      logger.error('[BranchJoin] duplicate pre-check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 처리에 실패했습니다.' });
    }

    // serviceKey / role 은 서버가 강제한다 — 클라이언트가 임의 서비스나 운영자로 신청할 수 없다.
    req.body = {
      ...body,
      ...(licenseNumber ? { licenseNumber } : {}),
      ...(activityType ? { activityType } : {}),
      service: SERVICE_KEY,
      role: 'member',
    };

    await AuthRegisterController.register(req, res);

    // Core 가 가입을 확정한 뒤에만 profile 을 승격한다. 응답은 이미 나갔으므로 결과는 로그로 남긴다.
    if (res.statusCode >= 200 && res.statusCode < 300 && (licenseNumber || activityType)) {
      try {
        const user = await AppDataSource.getRepository(User).findOne({ where: { email }, select: ['id'] });
        if (user) {
          const promoted = await PharmacistProfilePromotionService.ensureProfile({
            userId: user.id, licenseNumber, activityType,
          });
          logger.info('[BranchJoin] pharmacist profile promoted on join', {
            userId: user.id, created: promoted.created, filled: promoted.filled, licenseConflict: promoted.licenseConflict,
          });
        }
      } catch (error) {
        logger.error('[BranchJoin] pharmacist profile promotion failed (best-effort)', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * GET /api/v1/kpa-branch/join/status
   * 내 서비스 가입 상태 (requireAuth). 미가입이면 status='none'.
   * 분회 소속 상태는 /me/branch 가 별도로 응답한다 (축을 합치지 않는다).
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
          data: { serviceKey: SERVICE_KEY, status: 'none', role: null, canApply: true },
        });
      }

      const m = rows[0];
      return res.json({
        success: true,
        data: {
          serviceKey: SERVICE_KEY,
          membershipId: m.id,
          status: m.status,
          role: m.role,
          rejectionReason: m.rejection_reason ?? null,
          appliedAt: m.created_at,
          approvedAt: m.approved_at ?? null,
          updatedAt: m.updated_at,
          canApply: false,
        },
      });
    } catch (error) {
      logger.error('[BranchJoin] myStatus failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 상태 조회에 실패했습니다.' });
    }
  }
}
