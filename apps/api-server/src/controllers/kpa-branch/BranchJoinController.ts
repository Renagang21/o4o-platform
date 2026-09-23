/**
 * BranchJoinController — 분회 서비스 가입 신청 (Extension Layer)
 *
 * WO-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1
 *
 * 정책:
 *   - 가입 write-path 는 공통 SSOT(ServiceJoinService.apply)를 사용한다.
 *     이 컨트롤러는 serviceKey 강제 + 중복 상태 코드 분기만 담당하는 얇은 래퍼다
 *     (pharmacy-hub 선례). service_memberships 를 직접 INSERT 하지 않는다.
 *   - WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 가입은 Google 인증을 전제한다.
 *     users 생성 · service_credentials 생성이 이 경로에서 사라졌다.
 *   - serviceKey 는 항상 서버가 'kpa-branch' 로 강제한다. 클라이언트 값은 무시된다.
 *   - 신청 역할은 회원(member) 뿐이다. operator/admin 은 자가 신청 경로가 없다.
 *
 * 3축 분리 (혼합 금지):
 *   users(Identity · Google sub 정본) / service_memberships(서비스 접근)
 *   / branch_memberships(분회 소속). 이 컨트롤러는 앞의 두 축만 다루고 분회 소속은 만들지 않는다.
 *   분회 소속은 분회 운영자 경로(BranchMemberController.join)에서만 생성된다.
 *
 * 약사 profile (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1):
 *   - `licenseNumber` / `activityType` 를 받는다. 가입 성공 직후 **Extension 경계에서**
 *     `kpa_pharmacist_profiles` 를 만들거나 비어 있는 값만 채운다 (PharmacistProfilePromotionService).
 *   - 기존 profile 은 보존하고, 면허번호가 다른 사용자 것이면 자동 overwrite 하지 않는다.
 *   - auth-core 는 수정하지 않았다. `kpa_members` 에는 쓰지 않는다.
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ServiceJoinService } from '../../services/auth/service-join.service.js';
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
   * POST /api/v1/kpa-branch/join  (requireAuth)
   * 가입 신청 — Google 로 인증된 사용자를 분회 서비스 회원으로 신청시킨다.
   *
   * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
   *   이 경로는 더 이상 users 를 만들지 않는다. 계정 생성은 `POST /auth/google/signup` 하나뿐이고,
   *   여기서는 세션의 users.id 에 service_memberships(pending) 를 단다.
   *   email 로 사용자를 찾지 않는다 — Identity Key 는 Google sub → users.id 다.
   *   service_credentials 는 만들지 않는다 (password 축 없음).
   */
  static async apply(req: Request, res: Response): Promise<any> {
    const body = (req.body ?? {}) as Record<string, any>;

    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '가입 신청 전에 Google 계정으로 로그인해 주세요.',
        code: 'AUTH_REQUIRED',
      });
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

    let result;
    try {
      // serviceKey / role 은 서버가 강제한다 — 클라이언트가 임의 서비스나 운영자로 신청할 수 없다.
      result = await ServiceJoinService.apply({
        userId,
        serviceKey: SERVICE_KEY,
        role: 'member',
      });
    } catch (error) {
      logger.error('[BranchJoin] membership apply failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 처리에 실패했습니다.' });
    }

    if (result.outcome === 'duplicate') {
      const dup = DUPLICATE_RESPONSE[result.status] ?? DUPLICATE_RESPONSE.active;
      return res.status(409).json({
        success: false,
        error: dup.message,
        code: dup.code,
        data: { status: result.status },
      });
    }

    // 가입이 확정된 뒤에만 profile 을 승격한다 (Extension 경계 · auth-core 무변경).
    if (licenseNumber || activityType) {
      try {
        const promoted = await PharmacistProfilePromotionService.ensureProfile({
          userId, licenseNumber, activityType,
        });
        logger.info('[BranchJoin] pharmacist profile promoted on join', {
          created: promoted.created, filled: promoted.filled, licenseConflict: promoted.licenseConflict,
        });
      } catch (error) {
        logger.error('[BranchJoin] pharmacist profile promotion failed (best-effort)', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        serviceKey: SERVICE_KEY,
        status: 'pending',
        role: 'member',
        reapplied: result.outcome === 'reapplied',
      },
      message: '가입 신청이 접수되었습니다. 분회 서비스 운영자 승인 후 이용할 수 있습니다.',
    });
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
