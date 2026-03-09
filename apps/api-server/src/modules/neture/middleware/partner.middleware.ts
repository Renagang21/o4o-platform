/**
 * Neture Partner Middleware
 *
 * 파트너 인증/권한 미들웨어 — 중복 정의 제거.
 * 기존: neture.routes.ts 내부에 inline 정의
 * 통합: 이 파일에서 단일 정의
 */

import type { Request, Response } from 'express';
import { NetureService } from '../neture.service.js';
import { NeturePartnerStatus } from '../../../routes/neture/entities/neture-partner.entity.js';
import type { AuthenticatedRequest, PartnerRequest } from './types.js';

const netureService = new NetureService();

/**
 * Middleware: Require authenticated user to be an ACTIVE partner
 * 쓰기 작업용 — PENDING/SUSPENDED/INACTIVE 차단
 */
export async function requireActivePartner(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const partner = await netureService.getPartnerByUserId(authReq.user.id);
  if (!partner) {
    res.status(401).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
    return;
  }
  if (partner.status !== NeturePartnerStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      error: { code: 'PARTNER_NOT_ACTIVE', message: `Partner account is ${partner.status}. Only ACTIVE partners can perform this action.` },
      currentStatus: partner.status,
    });
    return;
  }
  (req as PartnerRequest).partnerId = partner.id;
  next();
}

/**
 * Middleware: Require authenticated user to be a linked partner (any status)
 * 읽기 작업용 — PENDING/SUSPENDED도 자신의 대시보드 조회 허용
 */
export async function requireLinkedPartner(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const partner = await netureService.getPartnerByUserId(authReq.user.id);
  if (!partner) {
    res.status(401).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
    return;
  }
  (req as PartnerRequest).partnerId = partner.id;
  next();
}
