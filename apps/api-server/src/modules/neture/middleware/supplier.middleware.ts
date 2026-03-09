/**
 * Neture Supplier Middleware
 *
 * 공급자 인증/권한 미들웨어 — 중복 정의 제거.
 * 기존: neture.routes.ts + neture-library.routes.ts 에 각각 정의
 * 통합: 이 파일에서 단일 정의
 */

import type { Request, Response } from 'express';
import { NetureService } from '../neture.service.js';
import { SupplierStatus } from '../entities/index.js';
import type { AuthenticatedRequest, SupplierRequest } from './types.js';

const netureService = new NetureService();

/**
 * Helper: Get supplier ID from authenticated user
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: fallback 제거 — user_id 매핑만 허용
 */
export async function getSupplierIdFromUser(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.user?.id) return null;
  return netureService.getSupplierIdByUserId(req.user.id);
}

/**
 * Middleware: Require authenticated user to be an ACTIVE supplier
 * 쓰기 작업용 — PENDING/REJECTED/INACTIVE 차단
 */
export async function requireActiveSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  if (supplier.status !== SupplierStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
      currentStatus: supplier.status,
    });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}

/**
 * Middleware: Require authenticated user to be a linked supplier (any status)
 * 읽기 작업용 — PENDING/REJECTED도 자신의 프로필/대시보드 조회 허용
 */
export async function requireLinkedSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}
