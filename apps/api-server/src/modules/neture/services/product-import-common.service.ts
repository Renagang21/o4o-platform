/**
 * Product Import Common Service
 *
 * CSV Import와 Catalog Import의 공통 로직 통합
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1 (3.5)
 *
 * ├─ upsertSupplierOffer()     — Offer UPSERT SQL (중복 제거)
 * ├─ processImportImages()     — 이미지 다운로드 + GCS 업로드 파이프라인
 * └─ triggerAiContentGeneration() — AI 콘텐츠 생성 파이프라인
 */

import type { EntityManager, DataSource } from 'typeorm';
import { OfferApprovalStatus } from '../entities/index.js';
import { ImageStorageService } from './image-storage.service.js';
import { ProductAiContentService } from '../../store-ai/services/product-ai-content.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import logger from '../../../utils/logger.js';

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
   */
  async upsertSupplierOffer(
    manager: EntityManager,
    masterId: string,
    supplierId: string,
    distributionType: string,
    price: number,
    barcode: string,
  ): Promise<void> {
    const slug = `${barcode}-${supplierId.slice(0, 8)}-${Date.now()}`;

    await manager.query(
      `INSERT INTO supplier_product_offers
        (id, master_id, supplier_id, distribution_type, approval_status, is_active,
         price_general, slug, created_at, updated_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, false, $5, $6, NOW(), NOW())
       ON CONFLICT (master_id, supplier_id) DO UPDATE SET
         price_general = EXCLUDED.price_general,
         distribution_type = EXCLUDED.distribution_type::supplier_product_offers_distribution_type_enum,
         updated_at = NOW()`,
      [masterId, supplierId, distributionType, OfferApprovalStatus.PENDING, price, slug],
    );

    logger.info(`[ImportCommon] Upserted offer: master=${masterId}, supplier=${supplierId}`);
  }

  // ── Image Pipeline ────────────────────────────────────────────────────

  /**
   * 외부 이미지 URL → fetch → GCS 업로드 → product_images INSERT
   *
   * Fire-and-forget — 실패해도 Offer 생성에 영향 없음
   */
  async processImportImages(
    jobs: Array<{ masterId: string; imageUrls: string[] }>,
  ): Promise<void> {
    for (const job of jobs) {
      for (let i = 0; i < job.imageUrls.length; i++) {
        try {
          const url = job.imageUrls[i];
          const response = await fetch(url);
          if (!response.ok) {
            logger.warn(`[ImportCommon] Image fetch failed (${response.status}): ${url}`);
            continue;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
          const filename = `import-${Date.now()}-${i}${ext}`;

          const { url: gcsUrl, gcsPath } = await this.imageStorageService.uploadImage(
            job.masterId, buffer, contentType, filename,
          );

          // Check existing image count for is_primary decision
          const existingImages: Array<{ cnt: string }> = await this.dataSource.query(
            `SELECT COUNT(*)::text AS cnt FROM product_images WHERE master_id = $1`,
            [job.masterId],
          );
          const isPrimary = i === 0 && Number(existingImages[0]?.cnt ?? 0) === 0;

          await this.dataSource.query(
            `INSERT INTO product_images (id, master_id, image_url, gcs_path, sort_order, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [job.masterId, gcsUrl, gcsPath, i, isPrimary],
          );

          logger.info(`[ImportCommon] Image uploaded: master=${job.masterId}, ${gcsUrl}`);
        } catch (err) {
          logger.warn(`[ImportCommon] Image failed: master=${job.masterId}, index=${i}:`, err);
        }
      }
    }
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
