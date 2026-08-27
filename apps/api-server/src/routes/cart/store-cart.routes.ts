/**
 * Store Cart Routes — Canonical Store Cart foundation
 * WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 매장 경영자(buyer)의 서버 백엔드 장바구니 저장/조회 API.
 *
 * 이 cart 는 **B2B cart** 다 — 소비자 장바구니가 아니다.
 * 담는 주체는 매장 경영자(buyer)이고 대상은 공급자 offer / event-offer 다.
 * `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` 가 계약 정본이다.
 * `O4O-STORE-COMMERCE-BOUNDARY-V1` 의 소비자 commerce 금지선 대상이 아니다(동 문서 §12).
 *
 * 경계: buyerId(=인증 사용자) + serviceKey(=URL 경로 파라미터) + **active service membership**.
 *   - CLAUDE.md §7 Guard Rule #4: serviceKey 는 경로 파라미터에서만 추출(스푸핑 금지).
 *   - buyerId 는 JWT 인증 사용자에서만 취득(body 신뢰 금지).
 *   - membership 판정은 DB(`service_memberships`) — JWT 스냅샷 금지.
 *
 * API Namespace: /api/v1/store/cart/:serviceKey/*
 *   GET    /cart/:serviceKey/items               — 목록
 *   POST   /cart/:serviceKey/items               — 담기
 *   PATCH  /cart/:serviceKey/items/:id           — 수량 변경
 *   DELETE /cart/:serviceKey/items/:id           — 항목 삭제
 *   DELETE /cart/:serviceKey                     — 비우기
 *   GET    /cart/:serviceKey/groups              — 공급자별 묶음
 *   GET    /cart/:serviceKey/checkout-preview    — checkout 준비 미리보기(주문 미생성)
 *   POST   /cart/:serviceKey/checkout-confirm    — event-offer 축 주문 확정(공급자별 분리 생성)
 *   POST   /cart/:serviceKey/checkout-confirm-b2b— B2B 축 주문 확정(payment-first, 공통 Core)
 *
 * 범위 밖: 소비자 checkout · PG 결제 기능 복구 · 매장이 판매자인 주문. 여기서 만들지 않는다.
 */
import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../types/auth.js';
import { getAllServiceKeys } from '../../config/service-catalog.js';
import {
  StoreCartService,
  CartError,
  type CartScope,
} from '../../services/cart/store-cart.service.js';
import {
  EventOfferCartCheckoutService,
  CartCheckoutError,
} from '../../services/cart/event-offer-cart-checkout.service.js';
import { NetureB2BCartCheckoutService } from '../../services/cart/neture-b2b-cart-checkout.service.js';
// WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1:
//   B2B confirm 은 하나의 service-agnostic Core 를 쓰고, 서비스별 공급 노출 정책만
//   strategy 로 갈린다. route 는 통일하지 않는다(§24) — 같은 URL 아래에서 wrapper 만 고른다.
import { StoreB2BCartCheckoutService } from '../../services/cart/store-b2b-cart-checkout.service.js';
import { B2BConfirmError } from '../../services/cart/b2b-checkout-confirm.core.js';
import { isApprovalEligibleServiceKey } from '../../modules/neture/constants/approval-service-keys.js';
// WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1 (결함 D1):
//   이 라우터는 인증만 요구하고 경로의 :serviceKey 에 대한 membership 을 확인하지 않았다.
//   그 결과 아무 서비스에도 소속되지 않은 인증 사용자가 임의 serviceKey 의 장바구니를 만들고
//   checkout-confirm 으로 B2B 주문까지 생성할 수 있었다 (cross-service leak).
//   판정 정본은 DB membership 이다 (JWT 스냅샷 금지 — `utils/service-membership.ts` 참조).
import { hasActiveServiceMembership } from '../../utils/service-membership.js';

type AuthMiddleware = RequestHandler;

export function createStoreCartRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StoreCartService(dataSource);
  const checkoutService = new EventOfferCartCheckoutService(dataSource);
  const b2bCheckoutService = new NetureB2BCartCheckoutService(dataSource);
  const storeB2BCheckoutService = new StoreB2BCartCheckoutService(dataSource);
  const validServiceKeys = new Set(getAllServiceKeys());

  // Lazy-load requireAuth to avoid circular import (store-local-product 패턴과 동일)
  let requireAuth: AuthMiddleware;
  async function getAuth(): Promise<AuthMiddleware> {
    if (!requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return requireAuth;
  }

  /**
   * 인증 통과 + cart 경계(buyerId + serviceKey) 확정.
   * 실패 시 응답을 직접 보내고 null 을 반환한다(호출부는 즉시 return).
   */
  async function resolveScope(req: Request, res: Response): Promise<CartScope | null> {
    const auth = await getAuth();
    try {
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });
    } catch {
      if (!res.headersSent) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
      return null;
    }
    if (res.headersSent) return null;

    const buyerId = (req as AuthRequest).user?.id;
    if (!buyerId) {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return null;
    }

    const serviceKey = req.params.serviceKey;
    if (!serviceKey || !validServiceKeys.has(serviceKey)) {
      res.status(400).json({
        success: false,
        error: `invalid serviceKey: ${serviceKey}`,
        code: 'VALIDATION_ERROR',
      });
      return null;
    }

    // WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1 (결함 D1):
    //   serviceKey 격리는 "경로 파라미터 검증"만으로 성립하지 않는다. 그 서비스에 실제로
    //   소속(active membership)돼 있어야 한다. suspended/pending/withdrawn/none 은 모두 차단.
    //   fail-closed — DB 오류도 통과가 아니다(hasActiveServiceMembership 계약).
    if (!(await hasActiveServiceMembership(dataSource, buyerId, serviceKey))) {
      res.status(403).json({
        success: false,
        error: '해당 서비스의 활성 회원만 이용할 수 있습니다.',
        code: 'SERVICE_MEMBERSHIP_REQUIRED',
      });
      return null;
    }

    return { buyerId, serviceKey };
  }

  function handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof CartError) {
      // WO-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1: 의약품 차단은 error.status(403)를 갖는다.
      const status = error.status ?? (error.code === 'NOT_FOUND' ? 404 : 400);
      res.status(status).json({ success: false, error: error.message, code: error.code });
      return;
    }
    if (error instanceof CartCheckoutError) {
      res.status(400).json({ success: false, error: error.message, code: error.code });
      return;
    }
    // 매장 조직 신뢰 경계(결함 O1)는 403/400 을 구분해서 돌려준다 —
    // 다중 조직 사용자는 "선택하라"(400 AMBIGUOUS)이고, 타인 조직은 "권한 없음"(403)이다.
    if (error instanceof B2BConfirmError) {
      res.status(error.status).json({ success: false, error: error.message, code: error.code });
      return;
    }
    console.error(`[StoreCart] ${context} error:`, error);
    res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
  }

  router.get('/cart/:serviceKey/items', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      const items = await service.list(scope);
      res.json({ success: true, data: { items, total: items.length } });
    } catch (error) {
      handleError(res, error, 'GET items');
    }
  });

  router.post('/cart/:serviceKey/items', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      const item = await service.add(scope, req.body ?? {});
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      handleError(res, error, 'POST items');
    }
  });

  router.patch('/cart/:serviceKey/items/:id', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      const item = await service.update(scope, req.params.id, { quantity: req.body?.quantity });
      res.json({ success: true, data: item });
    } catch (error) {
      handleError(res, error, 'PATCH items');
    }
  });

  router.delete('/cart/:serviceKey/items/:id', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      await service.remove(scope, req.params.id);
      res.json({ success: true, data: { removed: true } });
    } catch (error) {
      handleError(res, error, 'DELETE item');
    }
  });

  router.delete('/cart/:serviceKey', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      const removed = await service.clear(scope);
      res.json({ success: true, data: { removed } });
    } catch (error) {
      handleError(res, error, 'DELETE cart');
    }
  });

  router.get('/cart/:serviceKey/groups', async (req: Request, res: Response): Promise<void> => {
    const scope = await resolveScope(req, res);
    if (!scope) return;
    try {
      const groups = await service.groupBySupplier(scope);
      res.json({ success: true, data: { groups, supplierCount: groups.length } });
    } catch (error) {
      handleError(res, error, 'GET groups');
    }
  });

  router.get(
    '/cart/:serviceKey/checkout-preview',
    async (req: Request, res: Response): Promise<void> => {
      const scope = await resolveScope(req, res);
      if (!scope) return;
      try {
        const preview = await service.buildCheckoutPreview(scope);
        res.json({ success: true, data: preview });
      } catch (error) {
        handleError(res, error, 'GET checkout-preview');
      }
    },
  );

  // WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1 (Phase 1b):
  // cart 항목(KPA event_offer)을 공급자별 주문으로 확정. 주문/재고를 실제로 변경하므로 POST.
  router.post(
    '/cart/:serviceKey/checkout-confirm',
    async (req: Request, res: Response): Promise<void> => {
      const scope = await resolveScope(req, res);
      if (!scope) return;
      try {
        const body = req.body ?? {};
        const itemIds = Array.isArray(body.itemIds)
          ? body.itemIds.filter((x: unknown): x is string => typeof x === 'string')
          : undefined;
        const note = typeof body.note === 'string' ? body.note : undefined;
        const result = await checkoutService.confirm(scope, { itemIds, note });
        res.json({ success: true, data: result });
      } catch (error) {
        handleError(res, error, 'POST checkout-confirm');
      }
    },
  );

  // WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1 (P2a, payment-first):
  // b2b/regular cart 항목을 공급자별 checkout_orders 로 생성(paymentStatus='pending').
  // 결제 완료 전 공급자 미노출 · collectionStatus 미사용 · bridge 는 결제 완료 이후.
  // event_offer checkout-confirm 과 분리된 별도 엔드포인트(회귀 방지).
  //
  // WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1:
  //   승인축 서비스(glycopharm / kpa-society / k-cosmetics)는 `offer_service_approvals`
  //   승인이 필요한 wrapper 로, neture 는 자기 공급 정책 wrapper 로 간다.
  //   Pharmacy-Hub 는 자체 controller/route 를 유지한다(§21 · §24 — URL 통일 금지).
  router.post(
    '/cart/:serviceKey/checkout-confirm-b2b',
    async (req: Request, res: Response): Promise<void> => {
      const scope = await resolveScope(req, res);
      if (!scope) return;
      try {
        const body = req.body ?? {};
        const itemIds = Array.isArray(body.itemIds)
          ? body.itemIds.filter((x: unknown): x is string => typeof x === 'string')
          : undefined;
        const note = typeof body.note === 'string' ? body.note : undefined;
        // organizationId 는 **선택값(hint)** 이다. 권위는 서버 검증이다 (결함 O1).
        const organizationId =
          typeof body.organizationId === 'string' ? body.organizationId : undefined;

        // 공급 노출 정책이 다른 두 wrapper — 응답 shape 은 동일하다.
        const result = isApprovalEligibleServiceKey(scope.serviceKey)
          ? await storeB2BCheckoutService.confirm(scope, { itemIds, note, organizationId })
          : await b2bCheckoutService.confirm(scope, { itemIds, note, organizationId });
        res.json({ success: true, data: result });
      } catch (error) {
        handleError(res, error, 'POST checkout-confirm-b2b');
      }
    },
  );

  return router;
}
