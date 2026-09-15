/**
 * Neture Identity Middleware
 *
 * WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts — requireActiveSupplier, requireLinkedSupplier,
 * requireActivePartner, requireLinkedPartner
 *
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1 — 인증 오류 / 서비스 권한 오류 분리:
 *   401 UNAUTHORIZED          : 자격증명 없음·무효 (auth-client 가 refresh 를 시도하는 유일한 조건)
 *   403 NO_SUPPLIER/NO_PARTNER: 로그인은 유효하지만 공급자/파트너 서비스 미가입 (대표 로그인 유지)
 *   403 *_NOT_ACTIVE          : 가입은 있으나 신청 중·반려·정지·탈퇴
 * 서비스 미가입은 토큰 문제가 아니므로 401 로 내보내면 클라이언트가 refresh 실패→토큰 삭제→대표 로그아웃으로
 * 오판한다. 오류 코드·응답 구조는 그대로 두고 status 만 403 이다.
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';

// ==================== Request Type Augmentations ====================

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
    name?: string;
    roles?: string[];
  };
};

/** Request with supplierId set by requireActiveSupplier / requireLinkedSupplier middleware */
export type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};

/** Request with partnerId set by requireActivePartner / requireLinkedPartner middleware */
export type PartnerRequest = AuthenticatedRequest & {
  partnerId: string;
};

// ==================== Supplier Domain Gate ====================

/**
 * Middleware factory: Require authenticated user to be an ACTIVE supplier
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 * 쓰기 작업용 — PENDING/REJECTED/INACTIVE 차단
 */
export function createRequireActiveSupplier(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const rows = await dataSource.query(
      `SELECT id, status FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
      [authReq.user.id],
    );
    const supplier = rows[0];
    if (!supplier) {
      res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
      return;
    }
    if (supplier.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
        currentStatus: supplier.status,
      });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  };
}

/**
 * Middleware factory: Require authenticated user to be a linked supplier (any status)
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 * 읽기 작업용 — PENDING/REJECTED도 자신의 프로필/대시보드 조회 허용
 */
export function createRequireLinkedSupplier(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const rows = await dataSource.query(
      `SELECT id FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
      [authReq.user.id],
    );
    const supplier = rows[0];
    if (!supplier) {
      res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  };
}

// ==================== Partner Domain Gate ====================

/**
 * Middleware factory: Require authenticated user to be an ACTIVE partner
 * WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1
 * 쓰기 작업용 — PENDING/SUSPENDED/INACTIVE 차단
 */
export function createRequireActivePartner(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const rows = await dataSource.query(
      `SELECT id, status FROM neture.neture_partners WHERE user_id = $1 LIMIT 1`,
      [authReq.user.id],
    );
    const partner = rows[0];
    if (!partner) {
      res.status(403).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
      return;
    }
    // WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1:
    // neture.neture_partners.status 는 entity 기준 소문자('active') — 기존 대문자 비교는 항상 403 이었다.
    if (String(partner.status ?? '').toLowerCase() !== 'active') {
      res.status(403).json({
        success: false,
        error: { code: 'PARTNER_NOT_ACTIVE', message: `Partner account is ${partner.status}. Only active partners can perform this action.` },
        currentStatus: partner.status,
      });
      return;
    }
    (req as PartnerRequest).partnerId = partner.id;
    next();
  };
}

/**
 * Middleware factory: Require authenticated user to be a linked partner (any status)
 * WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1
 * 읽기 작업용 — PENDING/SUSPENDED도 자신의 대시보드 조회 허용
 */
export function createRequireLinkedPartner(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const rows = await dataSource.query(
      `SELECT id FROM neture.neture_partners WHERE user_id = $1 LIMIT 1`,
      [authReq.user.id],
    );
    const partner = rows[0];
    if (!partner) {
      res.status(403).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
      return;
    }
    (req as PartnerRequest).partnerId = partner.id;
    next();
  };
}

// ==================== Helper ====================

/**
 * Helper: Get supplier ID from authenticated user
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: fallback 제거 — user_id 매핑만 허용
 */
export function createGetSupplierIdFromUser(dataSource: DataSource) {
  return async (req: AuthenticatedRequest): Promise<string | null> => {
    if (!req.user?.id) return null;
    const rows = await dataSource.query(
      `SELECT id FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
      [req.user.id],
    );
    return rows[0]?.id || null;
  };
}
