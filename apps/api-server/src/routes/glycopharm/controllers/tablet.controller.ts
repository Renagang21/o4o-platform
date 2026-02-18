/**
 * Tablet Controller — In-Store Tablet Request Channel
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * Public (인증 불필요):
 * - GET  /stores/:slug/tablet/products       — TABLET 채널 상품 목록
 * - POST /stores/:slug/tablet/requests       — 주문 요청 생성 (rate-limited)
 * - GET  /stores/:slug/tablet/requests/:id   — 요청 상태 조회
 *
 * Staff (인증 + 소유자 확인):
 * - GET   /stores/:slug/tablet/staff/requests      — 활성 요청 목록 (polling)
 * - PATCH /stores/:slug/tablet/staff/requests/:id  — 상태 변경
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, In } from 'typeorm';
import rateLimit from 'express-rate-limit';
import { GlycopharmService } from '../services/glycopharm.service.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { TabletServiceRequest } from '../entities/tablet-service-request.entity.js';
import type { TabletServiceRequestStatus, TabletRequestItem } from '../entities/tablet-service-request.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

// ============================================================================
// TABLET Visibility Gate (separated from B2C frozen gate)
// Same 4-way join but with channel_type = 'TABLET'
// ============================================================================
async function queryTabletVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [pharmacyId];
  let paramIdx = 2;

  if (options.category) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(options.category);
    paramIdx++;
  }

  if (options.q && options.q.length >= 2) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`);
    params.push(`%${options.q}%`);
    paramIdx++;
  }

  const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

  const sortMap: Record<string, string> = {
    created_at: 'p.created_at',
    name: 'p.name',
    price: 'p.price',
    sort_order: 'p.sort_order',
  };
  const sortField = sortMap[options.sort || 'sort_order'] || 'p.sort_order';
  const sortOrder = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const countResult: Array<{ count: string }> = await dataSource.query(
    `SELECT COUNT(DISTINCT p.id)::int AS count
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = 'kpa'
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'TABLET'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}`,
    params,
  );
  const total = Number(countResult[0]?.count || 0);

  const data = await dataSource.query(
    `SELECT DISTINCT ON (p.id)
       p.id, p.name, p.sku, p.category, p.price, p.sale_price,
       p.stock_quantity, p.images, p.status, p.is_featured,
       p.manufacturer, p.description, p.short_description,
       p.sort_order, p.created_at, p.updated_at,
       p.pharmacy_id,
       opc.channel_price
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = 'kpa'
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'TABLET'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}
     ORDER BY p.id, ${sortField} ${sortOrder}
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Rate limiter: 10 requests per IP per 10 minutes
const tabletRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  },
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, TabletServiceRequestStatus[]> = {
  requested: ['acknowledged', 'served', 'cancelled'],
  acknowledged: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

export function createTabletController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const service = new GlycopharmService(dataSource);
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const requestRepo = dataSource.getRepository(TabletServiceRequest);

  // ============================================================================
  // GET /stores/:slug/tablet/products — TABLET 채널 상품 (public)
  // ============================================================================
  router.get('/:slug/tablet/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const result = await queryTabletVisibleProducts(dataSource, pharmacy.id, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'sort_order',
        order: (req.query.order as string) || 'asc',
        q: req.query.q as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[TabletController] GET /:slug/tablet/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet products' },
      });
    }
  });

  // ============================================================================
  // POST /stores/:slug/tablet/requests — 주문 요청 생성 (public, rate-limited)
  // ============================================================================
  router.post('/:slug/tablet/requests', tabletRequestLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const { items, note, customerName } = req.body;

      // 1. Resolve pharmacy
      const pharmacy = await service.getPharmacyEntityBySlug(slug);
      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // 2. Validate items
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ITEMS', message: '상품을 1개 이상 선택해주세요.' },
        });
        return;
      }

      if (items.length > 20) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_ITEMS', message: '한 번에 최대 20개 상품까지 요청 가능합니다.' },
        });
        return;
      }

      // 3. Validate each item and enrich with product info
      const enrichedItems: TabletRequestItem[] = [];
      for (const item of items) {
        if (!item.productId || typeof item.productId !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_ITEM', message: '각 항목에 productId가 필요합니다.' },
          });
          return;
        }
        const qty = Number(item.quantity);
        if (!qty || qty < 1 || qty > 99) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_QUANTITY', message: '수량은 1~99 사이여야 합니다.' },
          });
          return;
        }

        const product = await productRepo.findOne({
          where: { id: item.productId, pharmacy_id: pharmacy.id, status: 'active' },
        });
        if (!product) {
          res.status(400).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `상품을 찾을 수 없습니다: ${item.productId}` },
          });
          return;
        }

        enrichedItems.push({
          productId: product.id,
          quantity: qty,
          productName: product.name,
          price: Number(product.sale_price || product.price || 0),
        });
      }

      // 4. Create request
      const request = requestRepo.create({
        pharmacyId: pharmacy.id,
        items: enrichedItems,
        note: note?.trim() || undefined,
        customerName: customerName?.trim() || undefined,
        status: 'requested' as TabletServiceRequestStatus,
      });

      const saved = await requestRepo.save(request);

      res.status(201).json({
        success: true,
        data: {
          requestId: saved.id,
          status: saved.status,
          createdAt: saved.createdAt,
        },
      });
    } catch (error: any) {
      console.error('[TabletController] POST /:slug/tablet/requests error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 생성에 실패했습니다.' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/tablet/requests/:id — 요청 상태 조회 (public)
  // ============================================================================
  router.get('/:slug/tablet/requests/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const request = await requestRepo.findOne({ where: { id } });
      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: '요청을 찾을 수 없습니다.' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: request.id,
          status: request.status,
          items: request.items,
          note: request.note,
          customerName: request.customerName,
          createdAt: request.createdAt,
          acknowledgedAt: request.acknowledgedAt,
          servedAt: request.servedAt,
          cancelledAt: request.cancelledAt,
        },
      });
    } catch (error: any) {
      console.error('[TabletController] GET /:slug/tablet/requests/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 조회에 실패했습니다.' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/tablet/staff/requests — 활성 요청 목록 (authenticated)
  // ============================================================================
  router.get('/:slug/tablet/staff/requests', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;

      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });
      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not the owner of this store' },
        });
        return;
      }

      const requests = await requestRepo.find({
        where: {
          pharmacyId: pharmacy.id,
          status: In(['requested', 'acknowledged']),
        },
        order: { createdAt: 'DESC' },
        take: 50,
      });

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          items: r.items,
          note: r.note,
          customerName: r.customerName,
          status: r.status,
          createdAt: r.createdAt,
          acknowledgedAt: r.acknowledgedAt,
        })),
      });
    } catch (error: any) {
      console.error('[TabletController] GET /:slug/tablet/staff/requests error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet requests' },
      });
    }
  });

  // ============================================================================
  // PATCH /stores/:slug/tablet/staff/requests/:id — 상태 변경 (authenticated)
  // ============================================================================
  router.patch('/:slug/tablet/staff/requests/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug, id } = req.params;
      const { action } = req.body;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;

      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });
      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not the owner of this store' },
        });
        return;
      }

      if (!['acknowledge', 'serve', 'cancel'].includes(action)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACTION', message: 'action must be acknowledge, serve, or cancel' },
        });
        return;
      }

      const request = await requestRepo.findOne({
        where: { id, pharmacyId: pharmacy.id },
      });
      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: '요청을 찾을 수 없습니다.' },
        });
        return;
      }

      const actionToStatus: Record<string, TabletServiceRequestStatus> = {
        acknowledge: 'acknowledged',
        serve: 'served',
        cancel: 'cancelled',
      };
      const newStatus = actionToStatus[action];

      const allowed = VALID_TRANSITIONS[request.status] || [];
      if (!allowed.includes(newStatus)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from '${request.status}' to '${newStatus}'`,
          },
        });
        return;
      }

      // Update status + timestamp
      request.status = newStatus;
      if (newStatus === 'acknowledged') request.acknowledgedAt = new Date();
      if (newStatus === 'served') request.servedAt = new Date();
      if (newStatus === 'cancelled') request.cancelledAt = new Date();

      const saved = await requestRepo.save(request);

      res.json({
        success: true,
        data: {
          id: saved.id,
          status: saved.status,
          updatedAt: saved.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[TabletController] PATCH /:slug/tablet/staff/requests/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '상태 변경에 실패했습니다.' },
      });
    }
  });

  return router;
}
