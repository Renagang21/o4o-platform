/**
 * Neture 가입 승인 guard — 메인 AI 자동화 진입점용
 * (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5)
 *
 * 기준: neture.co.kr 메인 AI(통합 요청 · 홈 대화 · 작업 에이전트 · 로컬 에이전트 연결)는
 *   Neture 가입 승인(`service_memberships` service_key='neture' status='active') 회원만 쓴다.
 *   화면의 입력창 안내는 편의일 뿐이고, 이 guard 가 서버 판정이다.
 *
 * - serviceKey 는 고정 'neture' — 요청 body 의 surface · serviceKey 로 Neture 자격을 얻을 수 없다.
 * - 병원약국 화면(`surface:'hospital-drug'`)은 Neture 서비스가 아니다. `hospitalPublicScope` 옵션을 켠 진입점에서만
 *   Neture 미승인 요청을 **병원약국 서비스 자격 범위**로 내려보낸다 — 그 범위는 병원약국 서비스가 서버에서 정한
 *   공개 capability(무로그인 `/api/hospital/ai/request` 와 같은 약품 조사만 · 원내/화면/작업 실행 없음)다.
 *   body 로 얻을 수 있는 것은 누구나 쓰는 그 공개 경로 이상이 아니다. 판정 결과는 `res.locals.hospitalPublicScope`.
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

export interface NetureMainMembershipGuardOptions {
  /** Neture 미승인 · 병원약국 화면 첫 요청(runId 없음)을 병원약국 공개 범위로 내려보낸다(403 대신). */
  hospitalPublicScope?: boolean;
}

/** Neture 미승인 요청이 병원약국 공개 범위로 처리될 수 있는가 — 첫 요청만(재개 runId 는 Neture 실행 경로). */
export function isHospitalPublicScopeRequest(body: unknown): boolean {
  const b = (body ?? {}) as Record<string, unknown>;
  return b.surface === 'hospital-drug' && !(typeof b.runId === 'string' && b.runId.length > 0);
}

export function requireNetureMainMembership(dataSource: DataSource, options: NetureMainMembershipGuardOptions = {}) {
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
    if (options.hospitalPublicScope && isHospitalPublicScopeRequest(req.body)) {
      res.locals.hospitalPublicScope = true;
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
