/**
 * Neture Identity Middleware
 *
 * WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts — requireActiveSupplier, requireLinkedSupplier
 * (requireActivePartner / requireLinkedPartner 는 WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1 로 은퇴)
 *
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1 — 인증 오류 / 서비스 권한 오류 분리:
 *   401 UNAUTHORIZED          : 자격증명 없음·무효 (auth-client 가 refresh 를 시도하는 유일한 조건)
 *   403 NO_SUPPLIER            : 로그인은 유효하지만 공급자 서비스 미가입 (대표 로그인 유지)
 *   403 *_NOT_ACTIVE          : 가입은 있으나 신청 중·반려·정지·탈퇴
 * 서비스 미가입은 토큰 문제가 아니므로 401 로 내보내면 클라이언트가 refresh 실패→토큰 삭제→대표 로그아웃으로
 * 오판한다. 오류 코드·응답 구조는 그대로 두고 status 만 403 이다.
 *
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §A · §B:
 *   Supplier authorization 의 canonical relation 을
 *     user → organization_members(active) → organizations(type='supplier') → neture_suppliers.organization_id
 *   로 옮겼다. `neture_suppliers.user_id` 는 legacy compatibility pointer 이며 canonical 로
 *   resolve 되지 않을 때만 fallback 으로 쓰고 경고를 남긴다(silent fallback 금지).
 *   1 User : N Supplier 를 지원한다 — 후보가 여럿이면 임의 선택하지 않고
 *   409 SUPPLIER_CONTEXT_REQUIRED 로 explicit context 를 요구한다.
 *   **기존 응답 계약(401 UNAUTHORIZED · 403 NO_SUPPLIER · 403 SUPPLIER_NOT_ACTIVE + currentStatus)은 불변이다.**
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import {
  resolveSupplierForUser,
  readOrganizationContext,
  type SupplierResolution,
} from './supplier-context.resolver.js';

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
  /** WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1: canonical 관계로 resolve 된 공급자 조직 (legacy fallback 시 null 가능) */
  supplierOrganizationId?: string | null;
};

// ==================== Supplier Domain Gate ====================

/** 공통 응답 — 기존 계약 불변 */
function sendUnauthorized(res: Response): void {
  res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}
function sendNoSupplier(res: Response): void {
  res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
}
function sendForbiddenContext(res: Response): void {
  res.status(403).json({
    success: false,
    error: { code: 'SUPPLIER_CONTEXT_FORBIDDEN', message: 'You do not belong to the requested supplier organization.' },
  });
}
function sendContextRequired(res: Response, resolution: Extract<SupplierResolution, { kind: 'context_required' }>): void {
  res.status(409).json({
    success: false,
    error: {
      code: 'SUPPLIER_CONTEXT_REQUIRED',
      message: '여러 공급자 조직에 속해 있습니다. 작업할 조직을 지정해 주세요.',
    },
    candidates: resolution.candidates,
  });
}

/**
 * canonical resolve + 기존 응답 계약 매핑.
 * 통과하면 req.supplierId / req.supplierOrganizationId 를 세팅한다.
 */
async function resolveOrRespond(
  dataSource: DataSource,
  req: Request,
  res: Response,
): Promise<{ supplierId: string; status: string } | null> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    sendUnauthorized(res);
    return null;
  }
  const resolution = await resolveSupplierForUser(dataSource, authReq.user.id, readOrganizationContext(req));

  if (resolution.kind === 'none') {
    sendNoSupplier(res);
    return null;
  }
  if (resolution.kind === 'forbidden_context') {
    sendForbiddenContext(res);
    return null;
  }
  if (resolution.kind === 'context_required') {
    sendContextRequired(res, resolution);
    return null;
  }

  (req as SupplierRequest).supplierId = resolution.supplierId;
  (req as SupplierRequest).supplierOrganizationId = resolution.organizationId;
  return { supplierId: resolution.supplierId, status: resolution.status };
}

/**
 * Middleware factory: Require authenticated user to be an ACTIVE supplier
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 * 쓰기 작업용 — PENDING/REJECTED/INACTIVE 차단
 */
export function createRequireActiveSupplier(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const resolved = await resolveOrRespond(dataSource, req, res);
    if (!resolved) return;
    if (resolved.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${resolved.status}. Only ACTIVE suppliers can perform this action.` },
        currentStatus: resolved.status,
      });
      return;
    }
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
    const resolved = await resolveOrRespond(dataSource, req, res);
    if (!resolved) return;
    next();
  };
}

// ==================== Helper ====================

/**
 * Helper: Get supplier ID from authenticated user
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1: canonical(organization_members) resolve · legacy user_id 는 fallback
 */
export function createGetSupplierIdFromUser(dataSource: DataSource) {
  return async (req: AuthenticatedRequest): Promise<string | null> => {
    if (!req.user?.id) return null;
    // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1: canonical resolver 재사용(임의 선택 금지).
    const resolution = await resolveSupplierForUser(
      dataSource,
      req.user.id,
      readOrganizationContext(req as unknown as Request),
    );
    return resolution.kind === 'resolved' ? resolution.supplierId : null;
  };
}
