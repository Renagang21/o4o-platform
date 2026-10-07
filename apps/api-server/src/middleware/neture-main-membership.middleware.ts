/**
 * Neture 가입 승인 guard — 메인 AI 자동화 진입점용
 * (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5)
 *
 * 기준: neture.co.kr 메인 AI(통합 요청 · 홈 대화 · 작업 에이전트 · 로컬 에이전트 연결)는
 *   Neture 가입 승인(`service_memberships` service_key='neture' status='active') 회원만 쓴다.
 *   화면의 입력창 안내는 편의일 뿐이고, 이 guard 가 서버 판정이다.
 *
 * - serviceKey 는 고정 'neture' — 요청 body 의 surface · serviceKey 로 Neture 자격을 얻을 수 없다.
 * - 병원약국 화면(`surface:'hospital-drug'`)은 Neture 서비스가 아니고 이 리팩토링 대상도 아니다. `hospitalSurface`
 *   옵션을 켠 진입점(`/api/ai/request`)에서만, 병원약국 화면의 기존 호출(첫 요청 · runId 없음)을 가입 조회 없이
 *   기존 병원약국 처리로 보낸다 — Neture 가입 여부로 병원약국 동작이 달라지지 않는다. 판정 결과는
 *   `res.locals.hospitalSurfaceOnly` 이고, 핸들러는 이 표시가 있으면 병원약국 처리 밖(통합 라우터 · 홈 대화 ·
 *   Task 작업 · runId 재개)으로 내려가지 않는다. 병원약국 화면은 runId 재개를 보내지 않으므로 재개는 Neture 경로다.
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
  /** 병원약국 화면 첫 요청(runId 없음)은 가입 조회 없이 기존 병원약국 처리로 보낸다(403 대신). */
  hospitalSurface?: boolean;
}

/** 병원약국 화면의 기존 호출인가 — 첫 요청만(재개 runId 는 Neture 실행 경로). */
export function isHospitalSurfaceRequest(body: unknown): boolean {
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
    if (options.hospitalSurface && isHospitalSurfaceRequest(req.body)) {
      res.locals.hospitalSurfaceOnly = true;
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
