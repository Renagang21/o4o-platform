/**
 * Store Local Product Routes — CRUD for Display Domain
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1:
 *   검증·SQL 계약을 services/store/store-local-products.service.ts 로 추출하고
 *   이 라우트는 **인증·조직 결정 + 상태코드 매핑**만 담당한다.
 *   조직 결정은 종전 그대로 `resolveStoreAccess`(공통) — 변경하지 않았다.
 *   Pharmacy-Hub 는 같은 service 함수를 쓰되 조직만 PH enrollment 기준으로 해석한다
 *   (routes/pharmacy-hub — 라우트 복사 금지).
 *
 * StoreLocalProduct는 Commerce Object가 아니다.
 * Checkout/EcommerceOrder와 완전 분리된 Display Domain.
 *
 * WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
 *   조직 결정에 **명시적 service context** 를 받는다.
 *   서비스 중립 mount(`/api/v1/store/local-products`)는 back-compat 로 유지하되
 *   (`SERVICE_NEUTRAL_BACKCOMPAT`), 서비스별 mount 는 serviceKey 를 주입해
 *   handled-products 와 **같은 organization** 을 해석한다.
 *
 *   왜 필요한가 (프로덕션 실측): 다중 조직 사용자는 serviceKey 없는 해석이
 *   `is_primary DESC → joined_at ASC` 순으로 **다른 서비스의 조직**(예: Neture 공급자
 *   조직)을 고른다. 같은 화면군의 handled-products 는 serviceKey='kpa' 로 약국 조직을
 *   해석하므로 두 API 가 서로 다른 매장을 보게 된다(취급제품 local 8건 vs 자체상품 0건).
 *
 * API Namespace
 *   서비스 스코프 : /api/v1/{kpa|cosmetics|glycopharm}/store/local-products  (canonical)
 *   서비스 중립   : /api/v1/store/local-products                             (back-compat)
 *
 * ┌──────────────────────────────────────────────────────┐
 * │ AUTHENTICATED (requireAuth + pharmacy owner)         │
 * │  GET    /local-products       — 목록 조회            │
 * │  GET    /local-products/:id   — 단건 조회            │
 * │  POST   /local-products       — 생성                │
 * │  PUT    /local-products/:id   — 수정                │
 * │  DELETE /local-products/:id   — 비활성화             │
 * └──────────────────────────────────────────────────────┘
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';

type AuthMiddleware = RequestHandler;
import type { AuthRequest } from '../../types/auth.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';
import type { StoreOwnerServiceKey } from '../../utils/store-organization.resolver.js';
import {
  listLocalProducts,
  getLocalProduct,
  createLocalProduct,
  updateLocalProduct,
  deactivateLocalProduct,
  type ServiceResult,
  type ServiceFailure,
} from '../../services/store/store-local-products.service.js';

const FORBIDDEN = {
  success: false as const,
  error: 'Store owner or operator role required',
  code: 'FORBIDDEN' as const,
};

/**
 * 실패 결과를 그대로 상태코드로 매핑한다.
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: ServiceResult<unknown>): void {
  const failure = result as ServiceFailure;
  res.status(failure.status).json({ success: false, error: failure.error, code: failure.code });
}

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStoreLocalProductRoutes(
  dataSource: DataSource,
  /**
   * 지정 시 해당 서비스에 등록된 조직만 후보가 된다(타 서비스 조직 fallback 0).
   * 미지정 시 기존 서비스 중립 동작 — 신규 mount 는 반드시 지정한다.
   */
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();

  // Lazy-load requireAuth to avoid circular import
  let requireAuth: AuthMiddleware;
  async function getAuth(): Promise<AuthMiddleware> {
    if (!requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return requireAuth;
  }

  /**
   * 인증 + 조직 결정 (WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반).
   * @returns organizationId · 또는 null(응답은 이미 전송됨)
   */
  async function authorize(req: Request, res: Response): Promise<string | null> {
    const auth = await getAuth();
    await new Promise<void>((resolve, reject) => {
      (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
    });

    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(403).json(FORBIDDEN);
      return null;
    }
    const userRoles: string[] = authReq.user?.roles || [];
    return await resolveStoreAccess(dataSource, userId, userRoles, serviceKey);
  }

  /**
   * GET /local-products
   * 매장 자체 상품 목록 조회 (페이징, 카테고리 필터)
   */
  router.get('/local-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await authorize(req, res);
      if (res.headersSent) return;
      if (!organizationId) {
        res.json({ success: true, data: { items: [], total: 0 } });
        return;
      }

      const data = await listLocalProducts(dataSource, organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        category: req.query.category as string | undefined,
        activeOnly: req.query.activeOnly !== 'false',
        highlightOnly: req.query.highlightOnly === 'true',
      });
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreLocalProduct] GET /local-products error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch local products',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * GET /local-products/:id
   * 매장 자체 상품 단건 조회 (organization 격리)
   *
   * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
   *   canonical POP 화면(/store/marketing/pop)이 origin='local' 진입 시 prefill 하기 위한 read-only 조회.
   */
  router.get('/local-products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await authorize(req, res);
      if (res.headersSent) return;
      if (!organizationId) {
        res.status(403).json(FORBIDDEN);
        return;
      }

      const result = await getLocalProduct(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      console.error('[StoreLocalProduct] GET /local-products/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * POST /local-products
   * 매장 자체 상품 생성
   */
  router.post('/local-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await authorize(req, res);
      if (res.headersSent) return;
      if (!organizationId) {
        res.status(403).json(FORBIDDEN);
        return;
      }

      const result = await createLocalProduct(dataSource, organizationId, req.body);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error: any) {
      console.error('[StoreLocalProduct] POST /local-products error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PUT /local-products/:id
   * 매장 자체 상품 수정
   */
  router.put('/local-products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await authorize(req, res);
      if (res.headersSent) return;
      if (!organizationId) {
        res.status(403).json(FORBIDDEN);
        return;
      }

      const result = await updateLocalProduct(dataSource, organizationId, req.params.id, req.body);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      console.error('[StoreLocalProduct] PUT /local-products/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * DELETE /local-products/:id
   * 매장 자체 상품 비활성화 (soft delete)
   */
  router.delete('/local-products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await authorize(req, res);
      if (res.headersSent) return;
      if (!organizationId) {
        res.status(403).json(FORBIDDEN);
        return;
      }

      const result = await deactivateLocalProduct(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      console.error('[StoreLocalProduct] DELETE /local-products/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
