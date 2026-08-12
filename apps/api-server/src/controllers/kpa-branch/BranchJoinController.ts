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
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { ServiceMembership } from '../../modules/auth/entities/ServiceMembership.js';
import { AuthRegisterController } from '../../modules/auth/controllers/auth-register.controller.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

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
    req.body = { ...body, service: SERVICE_KEY, role: 'member' };

    return AuthRegisterController.register(req, res);
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
