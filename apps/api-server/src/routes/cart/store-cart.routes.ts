/**
 * Store Cart Routes — Canonical Store Cart foundation
 * WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 매장 경영자(buyer)의 서버 백엔드 장바구니 저장/조회 API.
 *
 * 경계: buyerId(=인증 사용자) + serviceKey(=URL 경로 파라미터).
 *   - CLAUDE.md §7 Guard Rule #4: serviceKey 는 경로 파라미터에서만 추출(스푸핑 금지).
 *   - buyerId 는 JWT 인증 사용자에서만 취득(body 신뢰 금지).
 *
 * API Namespace: /api/v1/store/cart/:serviceKey/*
 *   GET    /cart/:serviceKey/items             — 목록
 *   POST   /cart/:serviceKey/items             — 담기
 *   PATCH  /cart/:serviceKey/items/:id         — 수량 변경
 *   DELETE /cart/:serviceKey/items/:id         — 항목 삭제
 *   DELETE /cart/:serviceKey                   — 비우기
 *   GET    /cart/:serviceKey/groups            — 공급자별 묶음
 *   GET    /cart/:serviceKey/checkout-preview  — checkout 준비 미리보기(주문 미생성)
 *
 * V1 범위: foundation 저장/조회만. 기존 cart 대체·participate 제거·수량 차감 이전·
 *          주문/결제/정산 변경 없음.
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

type AuthMiddleware = RequestHandler;

export function createStoreCartRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StoreCartService(dataSource);
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

    return { buyerId, serviceKey };
  }

  function handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof CartError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message, code: error.code });
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

  return router;
}
