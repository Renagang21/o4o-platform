/**
 * Tourism Routes
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * ## 라우트 구조
 * - /api/v1/tourism/destinations - 관광지 정보
 * - /api/v1/tourism/packages - 패키지 정보
 * - /api/v1/tourism/orders - 주문 (E-commerce Core 위임)
 *
 * ## 중요 원칙
 * - Tourism은 O4O 표준 매장 패턴을 따름
 * - 주문은 E-commerce Core로 위임 (OrderType.TOURISM)
 * - tourism_orders 테이블 없음
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 *
 * @since Phase 5-C (2026-01-11)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createTourismOrderController } from './controllers/tourism-order.controller.js';

/**
 * Create tourism routes
 *
 * @param requireAuth 인증 미들웨어
 * @param requireScope 스코프 검증 미들웨어
 */
export function createTourismRoutes(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'tourism',
      version: '1.0.0',
      phase: '5-C',
      features: {
        orderDelegation: 'E-commerce Core',
        orderType: 'TOURISM',
      },
    });
  });

  // ============================================================================
  // DESTINATION ENDPOINTS (Public)
  // ============================================================================

  /**
   * GET /tourism/destinations
   * List all active destinations
   *
   * Note: Phase 5-C에서는 기본 구조만 제공
   */
  router.get('/destinations', async (_req: Request, res: Response) => {
    // TODO: DB 조회 구현 (Phase 5-C+)
    res.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  });

  /**
   * GET /tourism/destinations/:slug
   * Get destination by slug
   */
  router.get('/destinations/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    // TODO: DB 조회 구현 (Phase 5-C+)
    res.status(404).json({
      error: {
        code: 'DESTINATION_NOT_FOUND',
        message: `Destination not found: ${slug}`,
      },
    });
  });

  // ============================================================================
  // PACKAGE ENDPOINTS (Public)
  // ============================================================================

  /**
   * GET /tourism/packages
   * List all active packages
   */
  router.get('/packages', async (_req: Request, res: Response) => {
    // TODO: DB 조회 구현 (Phase 5-C+)
    res.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  });

  /**
   * GET /tourism/packages/:slug
   * Get package by slug
   */
  router.get('/packages/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    // TODO: DB 조회 구현 (Phase 5-C+)
    res.status(404).json({
      error: {
        code: 'PACKAGE_NOT_FOUND',
        message: `Package not found: ${slug}`,
      },
    });
  });

  // ============================================================================
  // ORDER ENDPOINTS (Authenticated, E-commerce Core 위임)
  // ============================================================================

  /**
   * Order routes
   *
   * Phase 5-C 핵심:
   * - POST /orders → checkoutService.createOrder() 호출
   * - OrderType.TOURISM 사용
   * - checkout_orders 테이블에 저장
   */
  router.use('/orders', createTourismOrderController(requireAuth, requireScope));

  return router;
}
