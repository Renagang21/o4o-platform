/**
 * Product Import Common Service
 *
 * CSV Import와 Catalog Import의 공통 로직 통합
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1 (3.5)
 * WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
 *   - upsertSupplierOffer() SQL 확장 (msrp/stockQty/description)
 *   - resolveBrandId() 브랜드 lookup/create
 *
 * ├─ upsertSupplierOffer()     — Offer UPSERT SQL (중복 제거)
 * ├─ resolveBrandId()          — 브랜드 name→id lookup/create
 * ├─ processImportImages()     — 이미지 다운로드 + GCS 업로드 파이프라인
 * └─ triggerAiContentGeneration() — AI 콘텐츠 생성 파이프라인
 */

import type { EntityManager, DataSource } from 'typeorm';
import { OfferApprovalStatus } from '../entities/index.js';
import { ImageStorageService } from './image-storage.service.js';
import { ProductAiContentService } from '../../store-ai/services/product-ai-content.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import { generateSlug } from '../../../utils/slug.js';
import logger from '../../../utils/logger.js';

/** 이미지 1건 복사 결과 (WO-O4O-NETURE-PRODUCT-IMPORT-IMAGE-STORAGE-BUCKET-ALIGNMENT-V1) */
export interface ImageImportItemResult {
  masterId: string;
  imageUrl: string;
  ok: boolean;
  /** 성공 시 O4O GCS URL */
  gcsUrl?: string;
  /** 실패 사유 (fetch_404 / 에러 메시지 등) */
  reason?: string;
}

/** processImportImages 결과 요약 — 조용한 실패 방지 + batch 저장/사용자 표시용 */
export interface ImageImportSummary {
  total: number;
  copied: number;
  failed: number;
  results: ImageImportItemResult[];
}

export class ProductImportCommonService {
  private imageStorageService: ImageStorageService;
  private aiContentService: ProductAiContentService;

  constructor(private dataSource: DataSource) {
    this.imageStorageService = new ImageStorageService();
    this.aiContentService = new ProductAiContentService(dataSource);
  }

  // ── Offer UPSERT ──────────────────────────────────────────────────────

  /**
   * Supplier Offer upsert — ON CONFLICT (master_id, supplier_id) DO UPDATE
   *
   * 기존 csv-import.service.ts와 catalog-import-offer.service.ts의 중복 SQL 통합
   * WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1: extra 필드 추가
   */
  async upsertSupplierOffer(
    manager: EntityManager,
    masterId: string,
    supplierId: string,
    distributionType: string,
    price: number,
    barcode: string,
    extra?: {
      msrp?: number | null;
      stockQty?: number | null;
      description?: string | null;
      detailDescription?: string | null;
      servicePrice?: number | null;
      spotPrice?: number | null;
    },
  ): Promise<string> {
    const slug = `${barcode}-${supplierId.slice(0, 8)}-${Date.now()}`;
    const msrp = extra?.msrp ?? null;
    const stockQty = extra?.stockQty ?? 0;
    const descriptionHtml = extra?.description ? `<p>${extra.description}</p>` : null;
    const detailHtml = extra?.detailDescription ? `<p>${extra.detailDescription}</p>` : null;
    const servicePrice = extra?.servicePrice ?? null;
    const spotPrice = extra?.spotPrice ?? null;

    // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: service_keys 포함
    // WO-NETURE-B2B-PRICE-THREE-TIER-POLICY-ALIGNMENT-V1: price_gold(서비스가), price_platinum(스팟가)
    await manager.query(
      `INSERT INTO supplier_product_offers
        (id, master_id, supplier_id, distribution_type, approval_status, is_active,
         price_general, price_gold, price_platinum, consumer_reference_price, stock_quantity,
         consumer_short_description, consumer_detail_description, slug, service_keys, created_at, updated_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, false, $5, $11, $12, $6, $7, $8, $9, $10, ARRAY[]::text[], NOW(), NOW())
       ON CONFLICT (master_id, supplier_id) DO UPDATE SET
         price_general = EXCLUDED.price_general,
         price_gold = COALESCE(EXCLUDED.price_gold, supplier_product_offers.price_gold),
         price_platinum = COALESCE(EXCLUDED.price_platinum, supplier_product_offers.price_platinum),
         consumer_reference_price = COALESCE(EXCLUDED.consumer_reference_price, supplier_product_offers.consumer_reference_price),
         stock_quantity = COALESCE(EXCLUDED.stock_quantity, supplier_product_offers.stock_quantity),
         consumer_short_description = COALESCE(EXCLUDED.consumer_short_description, supplier_product_offers.consumer_short_description),
         consumer_detail_description = COALESCE(EXCLUDED.consumer_detail_description, supplier_product_offers.consumer_detail_description),
         distribution_type = EXCLUDED.distribution_type::supplier_product_offers_distribution_type_enum,
         service_keys = supplier_product_offers.service_keys,
         updated_at = NOW()`,
      [masterId, supplierId, distributionType, OfferApprovalStatus.PENDING, price, msrp, stockQty, descriptionHtml, detailHtml, slug, servicePrice, spotPrice],
    );

    // WO-O4O-NETURE-IMPORT-PRODUCT-TRACE-V1: offer ID 조회 (RETURNING 대신 안전한 SELECT)
    const rows: Array<{ id: string }> = await manager.query(
      `SELECT id FROM supplier_product_offers WHERE master_id = $1 AND supplier_id = $2 LIMIT 1`,
      [masterId, supplierId],
    );
    const offerId = rows[0]?.id || '';

    logger.info(`[ImportCommon] Upserted offer: master=${masterId}, supplier=${supplierId}, offer=${offerId}`);
    return offerId;
  }

  // ── Brand Resolution ─────────────────────────────────────────────────

  /**
   * 브랜드 name → id lookup/create
   *
   * WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
   */
  async resolveBrandId(
    manager: EntityManager,
    brandName: string,
    manufacturerName?: string,
  ): Promise<string> {
    // 1. Lookup by exact name
    const existing: Array<{ id: string }> = await manager.query(
      `SELECT id FROM brands WHERE name = $1 LIMIT 1`,
      [brandName],
    );
    if (existing.length > 0) {
      return existing[0].id;
    }

    // 2. Generate unique slug
    let baseSlug = generateSlug(brandName);
    if (!baseSlug) {
      // Korean-only names → use name directly as slug
      baseSlug = brandName.trim().replace(/\s+/g, '-');
    }

    let slug = baseSlug;
    let counter = 1;
    while (counter <= 100) {
      const slugExists: Array<{ id: string }> = await manager.query(
        `SELECT id FROM brands WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (slugExists.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3. Insert brand
    const inserted: Array<{ id: string }> = await manager.query(
      `INSERT INTO brands (id, name, slug, manufacturer_name, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [brandName, slug, manufacturerName || null],
    );

    logger.info(`[ImportCommon] Brand resolved: "${brandName}" → ${inserted[0].id}`);
    return inserted[0].id;
  }

  // ── Image Pipeline ────────────────────────────────────────────────────

  /**
   * 외부 이미지 URL → fetch → GCS 업로드 → product_images INSERT
   *
   * Fire-and-forget — 실패해도 Offer 생성에 영향 없음.
   * WO-O4O-NETURE-PRODUCT-IMPORT-IMAGE-STORAGE-BUCKET-ALIGNMENT-V1:
   *   이미지별 성공/실패를 더 이상 조용히 삼키지 않고 구조화된 요약을 반환한다.
   *   호출부는 이를 로깅하거나 batch 에 저장해 사용자에게 표시한다.
   */
  async processImportImages(
    jobs: Array<{ masterId: string; imageUrls: string[] }>,
  ): Promise<ImageImportSummary> {
    const results: ImageImportItemResult[] = [];

    for (const job of jobs) {
      for (let i = 0; i < job.imageUrls.length; i++) {
        const url = job.imageUrls[i];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            results.push({ masterId: job.masterId, imageUrl: url, ok: false, reason: `fetch_${response.status}` });
            continue;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
          const filename = `import-${Date.now()}-${i}${ext}`;

          // WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: 첫 이미지→thumbnail, 나머지→detail
          const imgType = i === 0 ? 'thumbnail' : 'detail';
          const { url: gcsUrl, gcsPath } = await this.imageStorageService.uploadImage(
            job.masterId, buffer, contentType, filename, imgType as 'thumbnail' | 'detail',
          );

          // Check existing image count for is_primary decision
          const existingImages: Array<{ cnt: string }> = await this.dataSource.query(
            `SELECT COUNT(*)::text AS cnt FROM product_images WHERE master_id = $1`,
            [job.masterId],
          );
          const isPrimary = i === 0 && Number(existingImages[0]?.cnt ?? 0) === 0;

          await this.dataSource.query(
            `INSERT INTO product_images (id, master_id, image_url, gcs_path, sort_order, is_primary, type, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [job.masterId, gcsUrl, gcsPath, i, isPrimary, imgType],
          );

          logger.info(`[ImportCommon] Image uploaded: master=${job.masterId}, ${gcsUrl}`);
          results.push({ masterId: job.masterId, imageUrl: url, ok: true, gcsUrl });
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          logger.warn(`[ImportCommon] Image failed: master=${job.masterId}, index=${i}: ${reason}`);
          results.push({ masterId: job.masterId, imageUrl: url, ok: false, reason });
        }
      }
    }

    const copied = results.filter((r) => r.ok).length;
    const failed = results.length - copied;
    if (failed > 0) {
      logger.warn(
        `[ImportCommon] Image pipeline partial: ${copied} copied, ${failed} failed. ` +
          `failures=${JSON.stringify(results.filter((r) => !r.ok).map((r) => ({ m: r.masterId, u: r.imageUrl, r: r.reason })))}`,
      );
    }
    return { total: results.length, copied, failed, results };
  }

  // ── AI Content Generation ─────────────────────────────────────────────

  /**
   * AI 콘텐츠 생성 파이프라인 (fire-and-forget)
   */
  async triggerAiContentGeneration(inputs: ProductContentInput[]): Promise<void> {
    for (const input of inputs) {
      try {
        await this.aiContentService.generateAllContents(input);
        logger.info(`[ImportCommon] AI content generated: master=${input.id}`);
      } catch (err) {
        logger.warn(`[ImportCommon] AI content failed: master=${input.id}:`, err);
      }
    }
  }
}
