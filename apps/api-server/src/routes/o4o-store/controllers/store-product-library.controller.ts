/**
 * Store Product Library Controller
 *
 * WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1
 *
 * 매장(Store Owner)이 Product Library를 검색하고,
 * Offer를 선택하여 Store Listing을 직접 생성·관리하는 API.
 *
 * GET  /search                  — 제품 검색
 * GET  /master/:masterId/offers — Master의 공급자 Offer 목록
 * POST /list                    — Store Listing 생성
 * GET  /                        — 내 매장 진열 목록
 * PATCH /:id                    — Listing 수정 (isActive, price)
 * PATCH /:id/description        — 매장 상품 설명 override (WO-STORE-PRODUCT-DESCRIPTION-OVERRIDE-V1)
 *
 * 인증: requireAuth + requireStoreOwner (organization_members 기반)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { NetureService } from '../../../modules/neture/neture.service.js';
import logger from '../../../utils/logger.js';

export function createStoreProductLibraryController(dataSource: DataSource): Router {
  const router = Router();
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const requireStoreOwner = createRequireStoreOwner(dataSource);
  const netureService = new NetureService();

  // ─── GET /search — 제품 검색 (with offer count) ─────────────────────
  router.get('/search', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { q, categoryId, brandId, page, limit } = req.query;

    const result = await netureService.searchProductMasters({
      q: typeof q === 'string' ? q : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      brandId: typeof brandId === 'string' ? brandId : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    // Attach primary images + offer counts
    const masterIds = result.data.map((m) => m.id);
    let imageMap = new Map<string, string>();
    let offerCountMap = new Map<string, number>();

    if (masterIds.length > 0) {
      const images: Array<{ master_id: string; image_url: string }> = await dataSource.query(
        `SELECT master_id, image_url FROM product_images
         WHERE master_id = ANY($1) AND is_primary = true`,
        [masterIds],
      );
      imageMap = new Map(images.map((i) => [i.master_id, i.image_url]));

      const offerCounts: Array<{ master_id: string; cnt: string }> = await dataSource.query(
        `SELECT master_id, COUNT(*)::text AS cnt FROM supplier_product_offers
         WHERE master_id = ANY($1)
           AND approval_status = 'APPROVED'
           AND is_active = true
         GROUP BY master_id`,
        [masterIds],
      );
      offerCountMap = new Map(offerCounts.map((o) => [o.master_id, Number(o.cnt)]));
    }

    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Math.min(Number(limit), 50) : 20;

    const data = result.data.map((m) => ({
      id: m.id,
      barcode: m.barcode,
      name: m.name,
      regulatoryName: m.regulatoryName,
      manufacturerName: m.manufacturerName,
      specification: m.specification || null,
      category: m.category ? { id: m.category.id, name: m.category.name } : null,
      brand: m.brand ? { id: m.brand.id, name: m.brand.name } : null,
      primaryImageUrl: imageMap.get(m.id) || null,
      offerCount: offerCountMap.get(m.id) || 0,
    }));

    res.json({
      success: true,
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  }));

  // ─── GET /master/:masterId/offers — Master의 APPROVED Offer 목록 ───
  router.get('/master/:masterId/offers', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { masterId } = req.params;

    // WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1 (3.4)
    // 확장 필드: descriptions, price tiers, brand, manufacturer
    const offers = await dataSource.query(
      `SELECT spo.id, spo.supplier_id AS "supplierId", o.name AS "supplierName",
              spo.price_general AS "priceGeneral",
              spo.price_gold AS "priceGold",
              spo.price_platinum AS "pricePlatinum",
              spo.distribution_type AS "distributionType",
              spo.consumer_short_description AS "consumerShortDescription",
              spo.business_short_description AS "businessShortDescription",
              spo.business_detail_description AS "businessDetailDescription",
              COALESCE(spo.business_short_description, spo.consumer_short_description) AS "effectiveShortDescription",
              COALESCE(spo.business_detail_description, spo.consumer_detail_description) AS "effectiveDetailDescription",
              pm.brand_name AS "brandName",
              pm.manufacturer_name AS "manufacturerName"
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN organizations o ON o.id = s.organization_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       WHERE spo.master_id = $1
         AND spo.approval_status = 'APPROVED'
         AND spo.is_active = true
         AND s.status = 'ACTIVE'
       ORDER BY spo.price_general ASC`,
      [masterId],
    );

    res.json({ success: true, data: offers });
  }));

  // ─── POST /list — Store Listing 생성 ─────────────────────────────────
  router.post('/list', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { offerId, price } = req.body;

    if (!offerId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'offerId is required' } });
    }

    // Verify offer exists and is APPROVED + active
    const offerRows = await dataSource.query(
      `SELECT spo.id, spo.master_id
       FROM supplier_product_offers spo
       WHERE spo.id = $1
         AND spo.approval_status = 'APPROVED'
         AND spo.is_active = true`,
      [offerId],
    );

    if (offerRows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'OFFER_NOT_FOUND', message: 'Approved offer not found' } });
    }

    const masterId = offerRows[0].master_id;
    const listingPrice = price != null ? Number(price) : null;

    // Insert listing (ON CONFLICT DO NOTHING for idempotency)
    const insertResult = await dataSource.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id, is_active, price, created_at, updated_at)
       VALUES
        (gen_random_uuid(), $1, 'neture', $2, $3, true, $4, NOW(), NOW())
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
       RETURNING *`,
      [organizationId, masterId, offerId, listingPrice],
    );

    if (insertResult.length === 0) {
      // Already exists
      const existing = await listingRepo.findOne({
        where: { organization_id: organizationId, offer_id: offerId },
      });
      return res.json({ success: true, data: existing, message: 'ALREADY_LISTED' });
    }

    logger.info(`[StoreProductLibrary] Listing created: org=${organizationId}, offer=${offerId}`);
    res.status(201).json({ success: true, data: insertResult[0] });
  }));

  // ─── GET / — 내 매장 진열 목록 ───────────────────────────────────────
  router.get('/', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const [listings, countResult] = await Promise.all([
      dataSource.query(
        `SELECT opl.id, opl.is_active AS "isActive", opl.price, opl.created_at AS "createdAt",
                opl.updated_at AS "updatedAt",
                pm.id AS "masterId", pm.barcode, pm.name,
                pm.regulatory_name AS "regulatoryName", pm.manufacturer_name AS "manufacturerName",
                (SELECT pi.image_url FROM product_images pi
                 WHERE pi.master_id = pm.id AND pi.is_primary = true LIMIT 1) AS "primaryImage",
                spo.price_general AS "offerPrice", spo.distribution_type AS "distributionType",
                o.name AS "supplierName"
         FROM organization_product_listings opl
         LEFT JOIN product_masters pm ON opl.master_id = pm.id
         LEFT JOIN supplier_product_offers spo ON opl.offer_id = spo.id
         LEFT JOIN neture_suppliers s ON s.id = spo.supplier_id
         LEFT JOIN organizations o ON o.id = s.organization_id
         WHERE opl.organization_id = $1
         ORDER BY opl.created_at DESC
         LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset],
      ),
      dataSource.query(
        `SELECT COUNT(*)::int AS total FROM organization_product_listings WHERE organization_id = $1`,
        [organizationId],
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: listings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }));

  // ─── PATCH /:id — Listing 수정 (isActive, price) ────────────────────
  router.patch('/:id', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const { isActive, price } = req.body;

    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    if (isActive !== undefined) listing.is_active = isActive;
    if (price !== undefined) listing.price = price != null ? Number(price) : null;

    const updated = await listingRepo.save(listing);

    logger.info(`[StoreProductLibrary] Listing updated: id=${id}, org=${organizationId}`);
    res.json({ success: true, data: updated });
  }));

  // ─── PATCH /:id/description — 매장 상품 설명 override ──────────────
  // WO-STORE-PRODUCT-DESCRIPTION-OVERRIDE-V1 Phase 2
  //
  // :id = offer ID (spo.id) — 공개 상품 API에서 반환하는 ID와 동일
  // StoreProduct.description / shortDescription 를 매장 단위로 설정.
  // StoreProduct 없으면 CatalogProduct 기반 자동 생성 후 저장.
  router.patch('/:id/description', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { id: offerId } = req.params;
    const { description, shortDescription } = req.body;

    if (description === undefined && shortDescription === undefined) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'description or shortDescription required' } });
    }

    // 1. Listing 확인 — offer_id 기반 (boundary: organizationId)
    const listingRows: Array<{ id: string; master_id: string }> = await dataSource.query(
      `SELECT id, master_id FROM organization_product_listings
       WHERE offer_id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1`,
      [offerId, organizationId],
    );
    if (listingRows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product listing not found' } });
    }

    const masterId = listingRows[0].master_id;

    // 2. Upsert into store_product_profiles (storefront reads description from this table)
    // shortDescription → description (visible on storefront via COALESCE(sp.description, ...))
    // description      → pharmacist_comment (rich text detail, future use)
    const insertDesc = shortDescription !== undefined ? shortDescription : null;
    const insertComment = description !== undefined ? description : null;

    const result = await dataSource.query(
      `INSERT INTO store_product_profiles
         (id, organization_id, master_id, description, pharmacist_comment, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (organization_id, master_id) DO UPDATE
         SET description        = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE store_product_profiles.description END,
             pharmacist_comment = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE store_product_profiles.pharmacist_comment END,
             updated_at         = NOW()
       RETURNING id, description, pharmacist_comment AS "detailDescription", updated_at AS "updatedAt"`,
      [organizationId, masterId, insertDesc, insertComment],
    );

    logger.info(`[StoreProductLibrary] Description updated: master=${masterId}, org=${organizationId}`);
    res.json({ success: true, data: result[0] });
  }));

  return router;
}
