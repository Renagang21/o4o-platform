/**
 * Store Product Library Controller
 *
 * WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1
 * WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE2-V1
 *
 * 매장(Store Owner)이 Product Library를 검색하고,
 * Offer를 선택하여 Store Listing을 직접 생성·관리하는 API.
 *
 * GET  /search                          — 제품 검색
 * GET  /master/:masterId/offers         — Master의 공급자 Offer 목록
 * GET  /master/:masterId/images         — 상품 이미지 목록
 * POST /master/:masterId/images/from-url — URL→GCS 이미지 임포트
 * PATCH /images/reorder                 — 이미지 정렬 순서 일괄 저장
 * PATCH /images/:imageId/primary        — 대표 이미지 지정
 * DELETE /images/:imageId               — 이미지 삭제
 * POST /list                            — Store Listing 생성
 * GET  /                                — 내 매장 진열 목록
 * GET  /my-channels                     — 내 매장 채널 목록
 * PATCH /:id                            — Listing 수정 (isActive, price)
 * PATCH /:id/description                — 매장 상품 설명 override
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
import { ImageStorageService } from '../../../modules/neture/services/image-storage.service.js';
import logger from '../../../utils/logger.js';

// ── 허용 MIME 타입 (URL 임포트) ───────────────────────────────────────────────
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
]);

// ── URL에서 MIME 타입 추론 (Content-Type 헤더 또는 확장자 기반) ─────────────────
function inferMime(contentType: string | null, url: string): string {
  if (contentType) {
    const base = contentType.split(';')[0].trim().toLowerCase();
    if (ALLOWED_IMAGE_MIMES.has(base)) return base;
  }
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  };
  return extMap[ext ?? ''] ?? 'image/jpeg';
}

export function createStoreProductLibraryController(dataSource: DataSource): Router {
  const router = Router();
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const imageStorageService = new ImageStorageService();
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
  // WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1:
  //   offer 기반 (offerId 전달 시) + master 기반 (masterId만 전달 시) 양방향 지원.
  //   master 기반 등록 시 offer_id = NULL, 공급 연결 없이 매장 상품 생성.
  router.post('/list', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { offerId, masterId, price } = req.body;

    if (!offerId && !masterId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'offerId or masterId is required' } });
    }

    const listingPrice = price != null ? Number(price) : null;

    if (offerId) {
      // ── Offer 기반 등록 (기존 흐름 유지) ─────────────────────────────
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

      const resolvedMasterId = offerRows[0].master_id;

      const insertResult = await dataSource.query(
        `INSERT INTO organization_product_listings
          (id, organization_id, service_key, master_id, offer_id, is_active, price, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, 'neture', $2, $3, true, $4, NOW(), NOW())
         ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
         RETURNING *`,
        [organizationId, resolvedMasterId, offerId, listingPrice],
      );

      if (insertResult.length === 0) {
        const existing = await listingRepo.findOne({
          where: { organization_id: organizationId, offer_id: offerId },
        });
        return res.json({ success: true, data: existing, message: 'ALREADY_LISTED' });
      }

      logger.info(`[StoreProductLibrary] Listing created (offer): org=${organizationId}, offer=${offerId}`);
      return res.status(201).json({ success: true, data: insertResult[0] });

    } else {
      // ── Master 기반 등록 (offer_id = NULL) ────────────────────────────
      const masterRows = await dataSource.query(
        `SELECT id FROM product_masters WHERE id = $1`,
        [masterId],
      );

      if (masterRows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'MASTER_NOT_FOUND', message: 'Product master not found' } });
      }

      const insertResult = await dataSource.query(
        `INSERT INTO organization_product_listings
          (id, organization_id, service_key, master_id, offer_id, is_active, price, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, 'neture', $2, NULL, true, $3, NOW(), NOW())
         ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING
         RETURNING *`,
        [organizationId, masterId, listingPrice],
      );

      if (insertResult.length === 0) {
        const existingRows = await dataSource.query(
          `SELECT * FROM organization_product_listings
           WHERE organization_id = $1 AND service_key = 'neture' AND master_id = $2 AND offer_id IS NULL
           LIMIT 1`,
          [organizationId, masterId],
        );
        return res.json({ success: true, data: existingRows[0] ?? null, message: 'ALREADY_LISTED' });
      }

      logger.info(`[StoreProductLibrary] Listing created (master): org=${organizationId}, master=${masterId}`);
      return res.status(201).json({ success: true, data: insertResult[0] });
    }
  }));

  // ─── GET / — 내 매장 진열 목록 ───────────────────────────────────────
  router.get('/', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const [listings, countResult] = await Promise.all([
      dataSource.query(
        `SELECT opl.id, opl.offer_id AS "offerId", opl.is_active AS "isActive", opl.price, opl.created_at AS "createdAt",
                opl.updated_at AS "updatedAt",
                pm.id AS "masterId", pm.barcode, pm.name,
                pm.regulatory_name AS "regulatoryName", pm.manufacturer_name AS "manufacturerName",
                (SELECT pi.image_url FROM product_images pi
                 WHERE pi.master_id = pm.id AND pi.is_primary = true LIMIT 1) AS "primaryImage",
                (SELECT COUNT(*)::int FROM product_images pi WHERE pi.master_id = pm.id) AS "imageCount",
                spo.price_general AS "offerPrice", spo.distribution_type AS "distributionType",
                s.id AS "supplierId", o.name AS "supplierName"
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

  // ─── GET /master/:masterId/images — 상품 이미지 목록 ────────────────
  router.get('/master/:masterId/images', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { masterId } = req.params;

    const images = await dataSource.query(
      `SELECT id, image_url AS "imageUrl", gcs_path AS "gcsPath",
              type, is_primary AS "isPrimary", sort_order AS "sortOrder",
              created_at AS "createdAt"
       FROM product_images
       WHERE master_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [masterId],
    );

    res.json({ success: true, data: images });
  }));

  // ─── POST /master/:masterId/images/from-url — URL→GCS 이미지 임포트 ─
  // URL에서 이미지를 fetch하여 GCS에 저장 후 ProductImage로 등록.
  // 외부 URL은 저장하지 않는다 (GCS 경로만 참조).
  // WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE2-V1
  router.post('/master/:masterId/images/from-url', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { masterId } = req.params;
    const { url: imageUrl, type = 'detail' } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'url is required' } });
    }

    const imageType = ['thumbnail', 'detail', 'content'].includes(type)
      ? (type as 'thumbnail' | 'detail' | 'content')
      : 'detail';

    // 1. ProductMaster 존재 확인
    const masters = await dataSource.query(
      `SELECT id FROM product_masters WHERE id = $1`,
      [masterId],
    );
    if (masters.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'MASTER_NOT_FOUND', message: 'Product master not found' } });
    }

    // 2. URL fetch → Buffer
    let imageBuffer: Buffer;
    let mimeType: string;
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; O4OImageImport/1.0)' },
        size: 10 * 1024 * 1024, // 10MB limit
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: { code: 'FETCH_FAILED', message: `Failed to fetch image: HTTP ${response.status}` },
        });
      }

      mimeType = inferMime(response.headers.get('content-type'), imageUrl);
      if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_IMAGE_TYPE', message: 'Unsupported image type. Allowed: jpeg, png, webp, gif' },
        });
      }

      imageBuffer = Buffer.from(await response.arrayBuffer());
    } catch (err: any) {
      logger.warn(`[StoreProductImage] URL fetch failed: ${imageUrl}`, err);
      return res.status(400).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Could not download image from the provided URL' },
      });
    }

    // 3. GCS 업로드
    const originalName = imageUrl.split('/').pop()?.split('?')[0] ?? 'image.jpg';
    const { url: gcsUrl, gcsPath } = await imageStorageService.uploadImage(
      masterId,
      imageBuffer,
      mimeType,
      originalName,
      imageType,
    );

    // 4. DB 저장 (CatalogService 로직과 동일하게 직접 처리)
    // thumbnail: 기존 교체, detail/content: 다중 허용
    if (imageType === 'thumbnail') {
      const existing = await dataSource.query(
        `SELECT id, gcs_path FROM product_images WHERE master_id = $1 AND type = 'thumbnail'`,
        [masterId],
      );
      if (existing.length > 0) {
        await dataSource.query(`DELETE FROM product_images WHERE id = $1`, [existing[0].id]);
        if (existing[0].gcs_path) {
          imageStorageService.deleteImage(existing[0].gcs_path).catch(() => {});
        }
        // 기존 primary 해제
        await dataSource.query(
          `UPDATE product_images SET is_primary = false WHERE master_id = $1 AND is_primary = true`,
          [masterId],
        );
      }
    }

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM product_images WHERE master_id = $1`,
      [masterId],
    );
    const existingCount: number = countResult[0]?.cnt ?? 0;
    const isPrimary = imageType === 'thumbnail' ? true : existingCount === 0;

    const inserted = await dataSource.query(
      `INSERT INTO product_images
         (id, master_id, image_url, gcs_path, type, is_primary, sort_order, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, image_url AS "imageUrl", gcs_path AS "gcsPath",
                 type, is_primary AS "isPrimary", sort_order AS "sortOrder", created_at AS "createdAt"`,
      [masterId, gcsUrl, gcsPath, imageType, isPrimary, existingCount],
    );

    logger.info(`[StoreProductImage] Image imported: master=${masterId}, type=${imageType}, gcs=${gcsPath}`);
    res.status(201).json({ success: true, data: inserted[0] });
  }));

  // ─── PATCH /images/reorder — 이미지 정렬 순서 일괄 저장 ───────────────
  // body: { items: [{ id: string, sortOrder: number }] }
  // WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE3-V1
  router.patch('/images/reorder', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'items array is required' } });
    }

    // Validate each item
    for (const item of items) {
      if (typeof item.id !== 'string' || typeof item.sortOrder !== 'number') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Each item must have id (string) and sortOrder (number)' } });
      }
    }

    // Bulk UPDATE: unnest arrays for efficiency
    const ids = items.map((i: { id: string; sortOrder: number }) => i.id);
    const sortOrders = items.map((i: { id: string; sortOrder: number }) => i.sortOrder);

    await dataSource.query(
      `UPDATE product_images SET sort_order = t.sort_order::int, updated_at = NOW()
       FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::int[]) AS sort_order) t
       WHERE product_images.id = t.id`,
      [ids, sortOrders],
    );

    logger.info(`[StoreProductImage] Reordered ${items.length} images`);
    res.json({ success: true });
  }));

  // ─── PATCH /images/:imageId/primary — 대표 이미지 지정 ──────────────
  router.patch('/images/:imageId/primary', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { imageId } = req.params;

    // 어느 master 소속인지 확인
    const rows = await dataSource.query(
      `SELECT id, master_id FROM product_images WHERE id = $1`,
      [imageId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }
    const masterId = rows[0].master_id;

    // 기존 primary 해제 → 선택 이미지 primary 설정
    await dataSource.query(
      `UPDATE product_images SET is_primary = false WHERE master_id = $1`,
      [masterId],
    );
    await dataSource.query(
      `UPDATE product_images SET is_primary = true WHERE id = $1`,
      [imageId],
    );

    logger.info(`[StoreProductImage] Primary set: imageId=${imageId}, master=${masterId}`);
    res.json({ success: true });
  }));

  // ─── DELETE /images/:imageId — 이미지 삭제 ─────────────────────────
  router.delete('/images/:imageId', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const { imageId } = req.params;

    const rows = await dataSource.query(
      `SELECT id, master_id, gcs_path, is_primary FROM product_images WHERE id = $1`,
      [imageId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }

    const { master_id: masterId, gcs_path: gcsPath, is_primary: wasPrimary } = rows[0];

    await dataSource.query(`DELETE FROM product_images WHERE id = $1`, [imageId]);

    // GCS 파일 삭제 (실패해도 무시)
    if (gcsPath) {
      imageStorageService.deleteImage(gcsPath).catch(() => {});
    }

    // 대표 이미지였으면 다음 이미지를 대표로 승격
    if (wasPrimary) {
      await dataSource.query(
        `UPDATE product_images SET is_primary = true
         WHERE id = (SELECT id FROM product_images WHERE master_id = $1 ORDER BY sort_order ASC, created_at ASC LIMIT 1)`,
        [masterId],
      );
    }

    logger.info(`[StoreProductImage] Image deleted: imageId=${imageId}, master=${masterId}`);
    res.json({ success: true });
  }));

  // ─── GET /my-channels — 내 매장 채널 목록 (B2C/KIOSK) ──────────────
  // 채널 노출 토글 UI에서 사용. organization_channels에서 직접 조회.
  router.get('/my-channels', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;

    const channels = await dataSource.query(
      `SELECT id, channel_type AS "channelType", status, approved_at AS "approvedAt", created_at AS "createdAt"
       FROM organization_channels
       WHERE organization_id = $1
         AND channel_type IN ('B2C', 'KIOSK')
       ORDER BY created_at ASC`,
      [organizationId],
    );

    res.json({ success: true, data: channels });
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
