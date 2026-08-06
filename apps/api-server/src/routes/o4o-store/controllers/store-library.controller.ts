/**
 * Store Library Controller
 *
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 * WO-O4O-LIBRARY-SELECTOR-PAGINATION-V1
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 — CRUD 로직을 services/store/store-library.service.ts 로 추출.
 *   이 라우터는 **조직 결정(createRequireStoreOwner) + 응답 envelope** 만 담당한다.
 *   Pharmacy-Hub 는 같은 서비스 함수를 자기 조직 해석기와 함께 호출한다 (로직 복제 0).
 *   요청/응답 계약은 추출 전과 동일하다.
 *
 * 매장 자료실 CRUD (Display Domain).
 *
 * GET    /pharmacy/library            — 자료 목록 (페이지네이션 + 검색)
 * POST   /pharmacy/library            — 자료 생성
 * PUT    /pharmacy/library/:id        — 자료 수정
 * DELETE /pharmacy/library/:id        — soft-delete (is_active=false)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 * Neture FK 금지 — 프리필은 클라이언트 측에서만 처리
 *
 * asset_type별 검증:
 *   file          → fileUrl 필수, htmlContent 금지
 *   content       → htmlContent 필수, fileUrl 금지
 *   external-link → url 필수, fileUrl·htmlContent 금지
 *
 * DELETE 보호: QR 코드가 참조하는 항목은 삭제 불가 (409)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import {
  listLibraryAssets,
  createLibraryAsset,
  updateLibraryAsset,
  deactivateLibraryAsset,
  type LibraryFailure,
  type LibraryResult,
} from '../../../services/store/store-library.service.js';

type AuthMiddleware = RequestHandler;

/**
 * 실패 결과를 원본과 동일한 nested envelope 으로 내려보낸다.
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: LibraryResult<unknown>): void {
  const failure = result as LibraryFailure;
  res.status(failure.status).json({
    success: false,
    error: { code: failure.code, message: failure.message, ...(failure.details ?? {}) },
  });
}

export function createStoreLibraryController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1:
  //   serviceKey 지정 시 해당 서비스의 store_owner role 만 통과 (cross-service leakage 차단).
  //   미지정 시 기존 동작 유지 (back-compat).
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();

  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);

  // ─── GET /pharmacy/library — 자료 목록 (페이지네이션) ──────────
  router.get(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const data = await listLibraryAssets(dataSource, organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        category: req.query.category,
      });

      res.json({ success: true, data });
    }),
  );

  // ─── POST /pharmacy/library — 자료 생성 ────────────────────────
  router.post(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const result = await createLibraryAsset(dataSource, organizationId, req.body);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }

      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // ─── PUT /pharmacy/library/:id — 자료 수정 ────────────────────
  router.put(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const result = await updateLibraryAsset(dataSource, organizationId, req.params.id, req.body);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // ─── DELETE /pharmacy/library/:id — soft-delete ──────────────────
  router.delete(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const result = await deactivateLibraryAsset(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }

      res.json({ success: true, message: 'Library item deactivated' });
    }),
  );

  return router;
}
