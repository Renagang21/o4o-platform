/**
 * Store Public Tablet Handler — Tablet products + interest requests
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request endpoints
 *
 * Endpoints:
 *   GET  /:slug/tablet/products      — Tablet channel products (supplier + local)
 *   POST /:slug/tablet/interest      — Interest request creation (rate-limited)
 *   GET  /:slug/tablet/interest/:id  — Interest request status (kiosk polling)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { TabletInterestRequest, InterestRequestStatus } from '../entities/tablet-interest-request.entity.js';
import { ProductMaster } from '../../../modules/neture/entities/ProductMaster.entity.js';
import {
  resolvePublicStore,
  queryTabletVisibleProducts,
  tabletRequestLimiter,
} from './store-public-utils.js';

export function createStorePublicTabletRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  // GET /:slug/tablet/products — TABLET channel products (supplier + local)
  // WO-STORE-LOCAL-PRODUCT-DISPLAY-V1: local products 추가
  //
  // WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Query Separation Guard
  // supplierProducts와 localProducts는 반드시 별도 쿼리로 조회한다.
  // - supplierProducts: 4중 Visibility Gate (product.status + listing.is_active + channel.is_active + channel.status)
  // - localProducts: store_local_products 단순 조회 (is_active only)
  // DB UNION 금지. 애플리케이션 레벨 merge만 허용.
  // localProducts는 Checkout/EcommerceOrder와 무관한 Display Domain이다.
  router.get('/:slug/tablet/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      // Supplier products: 기존 4중 게이트 쿼리 (Commerce Domain — Checkout 진입 가능)
      const supplierResult = await queryTabletVisibleProducts(dataSource, resolved.storeId, resolved.serviceKey, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'sort_order',
        order: (req.query.order as string) || 'asc',
        q: req.query.q as string,
      });

      // Local products: Display Domain only (Checkout 진입 불가)
      // DB UNION 금지, 애플리케이션 레벨 merge
      // WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1: 콘텐츠 블록 필드 포함
      // detail_html, usage_info, caution_info는 목록에서 제외 (상세 조회 시에만)
      const localProducts = await dataSource.query(
        `SELECT id, name, description, summary, thumbnail_url, images, gallery_images,
                category, price_display, badge_type, highlight_flag, sort_order
         FROM store_local_products
         WHERE organization_id = $1 AND is_active = true
         ORDER BY sort_order ASC, name ASC`,
        [resolved.storeId],
      );

      res.json({
        success: true,
        ...supplierResult,
        localProducts,
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet products' },
      });
    }
  });

  // POST /:slug/tablet/interest — Interest request creation (public, rate-limited)
  // WO-O4O-TABLET-MODULE-V1: 고객이 개별 상품에 관심 표시
  router.post('/:slug/tablet/interest', tabletRequestLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { masterId, customerName, customerNote } = req.body;

      if (!masterId || typeof masterId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MASTER_ID', message: '상품 ID가 필요합니다.' },
        });
        return;
      }

      // Master 존재 확인
      const masterRepo = dataSource.getRepository(ProductMaster);
      const master = await masterRepo.findOne({
        where: { id: masterId },
        select: ['id', 'name'],
      });
      if (!master) {
        res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다.' },
        });
        return;
      }

      // 관심 요청 생성
      const interestRepo = dataSource.getRepository(TabletInterestRequest);
      const interest = interestRepo.create({
        organizationId: resolved.storeId,
        masterId: master.id,
        productName: master.name,
        customerName: customerName?.trim() || undefined,
        customerNote: customerNote?.trim() || undefined,
        status: InterestRequestStatus.REQUESTED,
      });

      const saved = await interestRepo.save(interest);

      res.status(201).json({
        success: true,
        data: {
          requestId: saved.id,
          status: saved.status,
          productName: saved.productName,
          createdAt: saved.createdAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] POST /:slug/tablet/interest error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '관심 요청 생성에 실패했습니다.' },
      });
    }
  });

  // GET /:slug/tablet/interest/:id — Interest request status (public, kiosk polling)
  // WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
  router.get('/:slug/tablet/interest/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const interestRepo = dataSource.getRepository(TabletInterestRequest);
      const request = await interestRepo.findOne({
        where: { id, organizationId: resolved.storeId },
      });

      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'INTEREST_NOT_FOUND', message: '요청을 찾을 수 없습니다.' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: request.id,
          status: request.status,
          productName: request.productName,
          customerName: request.customerName,
          customerNote: request.customerNote,
          createdAt: request.createdAt,
          acknowledgedAt: request.acknowledgedAt,
          completedAt: request.completedAt,
          cancelledAt: request.cancelledAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/interest/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 조회에 실패했습니다.' },
      });
    }
  });

  return router;
}
