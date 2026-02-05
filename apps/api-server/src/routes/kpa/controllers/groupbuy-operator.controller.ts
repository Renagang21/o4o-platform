/**
 * KPA Groupbuy Operator Controller
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1: 공동구매 운영자용 API
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1: 공급자 통계 연계 드라이런
 *
 * 책임 경계:
 * - 상품 노출 관리 (추가/제거/토글/순서)
 * - 집계 통계 조회
 * - 공급자 통계 연계 상태 확인
 * - 주문/결제/배송은 공급자 시스템에서 처리 (본 API 범위 외)
 *
 * 캐시 정책:
 * - 통계 조회: 캐시 유효시간 10~30분
 * - 자동 백그라운드 수집 없음
 * - 운영자 화면 접근 시에만 조회
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { supplierStatsService } from '../services/supplier-stats.service.js';
import { isKpaOperator } from '../services/kpa-operator.service.js';

type AuthMiddleware = RequestHandler;

// Types
interface GroupbuyProduct {
  id: string;
  title: string;
  supplierName: string;
  conditionSummary: string;
  orderCount: number;
  participantCount: number;
  isVisible: boolean;
  order: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
}

interface GroupbuyStats {
  totalOrders: number;
  totalParticipants: number;
  dailyOrders: { date: string; count: number }[];
  productOrders: { productId: string; productName: string; orderCount: number }[];
  /** 캐시 정보 */
  cachedAt?: string;
  cacheValidUntil?: string;
}

// Error codes
const ERROR_CODES = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
  FORBIDDEN: { code: 'FORBIDDEN', message: '접근 권한이 없습니다. 운영자 권한이 필요합니다.' },
  STATS_UNAVAILABLE: { code: 'STATS_UNAVAILABLE', message: '통계 집계 중입니다. 잠시 후 다시 시도해 주세요.' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
} as const;

/**
 * WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
 * 기존 isOperator() 함수 제거됨
 * → isKpaOperator(userId) 사용 (KpaMember 기반)
 */

/**
 * Create standardized error response
 */
function createErrorResponse(
  res: Response,
  status: number,
  errorCode: keyof typeof ERROR_CODES
): void {
  res.status(status).json({
    success: false,
    error: ERROR_CODES[errorCode],
  });
}

export function createGroupbuyOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /groupbuy-admin/products
   * 공동구매 상품 목록 (운영자용)
   */
  router.get(
    '/products',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        // 인증 확인
        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        // 현재 공동구매 Entity가 없으므로 빈 배열 반환
        // 추후 공급자 시스템 연동 시 실제 데이터로 교체
        const products: GroupbuyProduct[] = [];

        res.json({
          success: true,
          data: products,
        });
      } catch (error: any) {
        console.error('Failed to get groupbuy products:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/visibility
   * 상품 노출/비노출 토글
   */
  router.post(
    '/products/:id/visibility',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지
        const { id } = req.params;
        const { isVisible } = req.body;

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        // 현재 Entity 없음 - 추후 구현
        res.json({
          success: true,
          data: { id, isVisible },
        });
      } catch (error: any) {
        console.error('Failed to update product visibility:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/order
   * 상품 순서 변경
   */
  router.post(
    '/products/:id/order',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지
        const { id } = req.params;
        const { order } = req.body;

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        // 현재 Entity 없음 - 추후 구현
        res.json({
          success: true,
          data: { id, order },
        });
      } catch (error: any) {
        console.error('Failed to update product order:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products
   * 공동구매 상품 추가 (노출 등록)
   */
  router.post(
    '/products',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        const { title, supplierName, conditionSummary, startDate, endDate } = req.body;

        // 현재 Entity 없음 - 추후 구현
        res.json({
          success: true,
          data: {
            id: `temp-${Date.now()}`,
            title,
            supplierName,
            conditionSummary,
            startDate,
            endDate,
            isVisible: true,
            order: 0,
          },
        });
      } catch (error: any) {
        console.error('Failed to add groupbuy product:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * DELETE /groupbuy-admin/products/:id
   * 공동구매 상품 제거 (노출 해제)
   */
  router.delete(
    '/products/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지
        const { id } = req.params;

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        // 현재 Entity 없음 - 추후 구현
        res.json({
          success: true,
          data: { id, removed: true },
        });
      } catch (error: any) {
        console.error('Failed to remove groupbuy product:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * GET /groupbuy-admin/stats
   * 공동구매 집계 통계 조회
   *
   * 캐시 정책:
   * - 캐시 유효시간: 10~30분
   * - 자동 백그라운드 수집 없음
   * - 운영자 화면 접근 시에만 조회
   */
  router.get(
    '/stats',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        // 공급자 통계 서비스 조회 시도
        const supplierResult = await supplierStatsService.getStats();

        // 캐시 정보 계산
        const now = new Date();
        const cacheValidUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30분

        // 공급자 데이터 또는 빈 데이터 반환
        const stats: GroupbuyStats = {
          totalOrders: supplierResult.data?.totalOrders ?? 0,
          totalParticipants: supplierResult.data?.totalPharmacies ?? 0,
          dailyOrders: supplierResult.data?.daily?.map(d => ({
            date: d.date,
            count: d.orderCount,
          })) ?? [],
          productOrders: supplierResult.data?.byProduct?.map(p => ({
            productId: p.productId,
            productName: p.productName,
            orderCount: p.orderCount,
          })) ?? [],
          cachedAt: supplierResult.cachedAt || now.toISOString(),
          cacheValidUntil: cacheValidUntil.toISOString(),
        };

        res.json({
          success: true,
          data: stats,
          // 드라이런 검증용 메타 정보
          _meta: {
            supplierStatus: supplierResult.status,
            fromCache: supplierResult.fromCache,
            responseTime: supplierResult.responseTime,
          },
        });
      } catch (error: any) {
        console.error('Failed to get groupbuy stats:', error);
        // 통계 조회 실패 시 전용 에러 메시지
        createErrorResponse(res, 503, 'STATS_UNAVAILABLE');
      }
    }
  );

  /**
   * GET /groupbuy-admin/supplier-status
   * 공급자 연계 상태 확인 (드라이런 검증용)
   *
   * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1
   */
  router.get(
    '/supplier-status',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: User.roles 사용 금지

        if (!userId) {
          createErrorResponse(res, 401, 'UNAUTHORIZED');
          return;
        }

        // 권한 확인 (WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: KpaMember 기반)
        const isOperator = await isKpaOperator(userId);
        if (!isOperator) {
          createErrorResponse(res, 403, 'FORBIDDEN');
          return;
        }

        const connectionStatus = await supplierStatsService.checkConnection();

        res.json({
          success: true,
          data: {
            mode: supplierStatsService.getMode(),
            connection: connectionStatus,
            checkedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error('Failed to check supplier status:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  return router;
}
