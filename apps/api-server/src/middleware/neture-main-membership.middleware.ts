/**
 * Neture 가입 승인 guard — 메인 AI 자동화 진입점용
 * (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5)
 *
 * 기준: neture.co.kr 메인 AI(통합 요청 · 홈 대화 · 작업 에이전트 · 로컬 에이전트 연결)는
 *   Neture 가입 승인(`service_memberships` service_key='neture' status='active') 회원만 쓴다.
 *   화면의 입력창 안내는 편의일 뿐이고, 이 guard 가 서버 판정이다.
 *
 * - serviceKey 는 고정 'neture' — 요청 body 의 surface · serviceKey 로 우회할 수 없다
 *   (병원약국 전용 화면 `surface:'hospital-drug'` 도 같다. 병원약국 서비스 자체는 별도 `/api/hospital/*`).
 * - 예외는 서버가 확인한 `platform:super_admin`(운영 break-glass) 하나뿐이다.
 * - 판정은 매 요청 DB 에서 한다(JWT 스냅샷 불사용 — 정지 즉시성). DB 오류는 통과가 아니다(fail-closed).
 * - 이 guard 는 상태를 읽기만 한다.
 */
import type { NextFunction, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';
import { isPlatformSuperAdmin } from '../utils/role.utils.js';
import {
  getNetureMainMembershipStatus,
  NETURE_MAIN_MEMBERSHIP_MESSAGES,
  NETURE_MEMBERSHIP_REQUIRED,
} from '../modules/neture/services/neture-main-membership.js';

export function requireNetureMainMembership(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user as (AuthRequest['user'] & { roles?: string[] }) | undefined;
    const userId = user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated', code: 'UNAUTHORIZED' });
      return;
    }
    if (isPlatformSuperAdmin(Array.isArray(user?.roles) ? user!.roles : [])) {
      next();
      return;
    }
    let status;
    try {
      status = await getNetureMainMembershipStatus(dataSource, userId);
    } catch (err) {
      logger.error('[NetureMainMembership] status lookup failed', { error: (err as Error)?.message });
      res.status(503).json({
        success: false,
        error: 'Neture 가입 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        code: 'NETURE_MEMBERSHIP_CHECK_FAILED',
      });
      return;
    }
    if (status === 'active') {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: NETURE_MAIN_MEMBERSHIP_MESSAGES[status],
      code: NETURE_MEMBERSHIP_REQUIRED,
      details: { netureMembershipStatus: status },
    });
  };
}
