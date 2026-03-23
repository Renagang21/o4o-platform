/**
 * Operator Product Cleanup Controller
 *
 * WO-NETURE-PRODUCT-DATA-CLEANUP-V1
 *
 * 상품 데이터 품질 점검 및 정리 — 운영자 전용
 *
 * Routes (mounted at /operator/product-cleanup):
 *   GET  /duplicate-masters   — barcode 기준 중복 Master 탐지
 *   GET  /missing-category    — category_id NULL 상품 조회
 *   GET  /missing-brand       — brand_id NULL 상품 조회
 *   POST /merge-masters       — Master 병합 (source → target)
 *   PATCH /fix-category       — category 일괄 수정
 *   PATCH /fix-brand          — brand 일괄 수정
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import logger from '../../../utils/logger.js';

export function createOperatorProductCleanupController(dataSource: DataSource): Router {
  const router = Router();

  // Router-level guard
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/product-cleanup/duplicate-masters
   * barcode 기준 중복 Master 탐지
   */
  router.get('/duplicate-masters', async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await dataSource.query(`
        SELECT
          pm.barcode,
          COUNT(*)::int AS count,
          ARRAY_AGG(pm.id ORDER BY pm.created_at ASC) AS "masterIds",
          ARRAY_AGG(pm.marketing_name ORDER BY pm.created_at ASC) AS names
        FROM product_masters pm
        WHERE pm.barcode IS NOT NULL AND pm.barcode != ''
        GROUP BY pm.barcode
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Product Cleanup] Error fetching duplicate masters:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /operator/product-cleanup/missing-category
   * category_id NULL 상품 조회
   */
  router.get('/missing-category', async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await dataSource.query(`
        SELECT
          pm.id,
          pm.barcode,
          pm.marketing_name AS "marketingName",
          pm.manufacturer_name AS "manufacturerName",
          pm.brand_name AS "brandName",
          pm.regulatory_type AS "regulatoryType",
          (SELECT COUNT(*)::int FROM supplier_product_offers spo WHERE spo.master_id = pm.id) AS "offerCount"
        FROM product_masters pm
        WHERE pm.category_id IS NULL
        ORDER BY pm.marketing_name ASC
        LIMIT 200
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Product Cleanup] Error fetching missing category:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /operator/product-cleanup/missing-brand
   * brand_id NULL 상품 조회
   */
  router.get('/missing-brand', async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await dataSource.query(`
        SELECT
          pm.id,
          pm.barcode,
          pm.marketing_name AS "marketingName",
          pm.manufacturer_name AS "manufacturerName",
          pm.brand_name AS "brandName",
          pm.regulatory_type AS "regulatoryType",
          (SELECT COUNT(*)::int FROM supplier_product_offers spo WHERE spo.master_id = pm.id) AS "offerCount"
        FROM product_masters pm
        WHERE pm.brand_id IS NULL
        ORDER BY pm.marketing_name ASC
        LIMIT 200
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Product Cleanup] Error fetching missing brand:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /operator/product-cleanup/merge-masters
   * Master 병합 (source → target)
   * - supplier_product_offers.master_id 이관
   * - product_images.master_id 이관
   * - source master 삭제
   */
  router.post('/merge-masters', async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceMasterId, targetMasterId } = req.body;
      if (!sourceMasterId || !targetMasterId) {
        res.status(400).json({ success: false, error: 'BOTH_MASTER_IDS_REQUIRED' });
        return;
      }
      if (sourceMasterId === targetMasterId) {
        res.status(400).json({ success: false, error: 'SAME_MASTER' });
        return;
      }

      // Verify both exist
      const [source] = await dataSource.query(
        `SELECT id, barcode, marketing_name FROM product_masters WHERE id = $1`, [sourceMasterId],
      );
      if (!source) {
        res.status(404).json({ success: false, error: 'SOURCE_MASTER_NOT_FOUND' });
        return;
      }
      const [target] = await dataSource.query(
        `SELECT id, barcode, marketing_name FROM product_masters WHERE id = $1`, [targetMasterId],
      );
      if (!target) {
        res.status(404).json({ success: false, error: 'TARGET_MASTER_NOT_FOUND' });
        return;
      }

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // 1. Migrate offers
        const offerResult = await queryRunner.query(
          `UPDATE supplier_product_offers SET master_id = $1 WHERE master_id = $2`,
          [targetMasterId, sourceMasterId],
        );
        const offersMigrated = offerResult?.[1] ?? 0;

        // 2. Migrate images
        const imageResult = await queryRunner.query(
          `UPDATE product_images SET master_id = $1 WHERE master_id = $2`,
          [targetMasterId, sourceMasterId],
        );
        const imagesMigrated = imageResult?.[1] ?? 0;

        // 3. Delete source master
        await queryRunner.query(`DELETE FROM product_masters WHERE id = $1`, [sourceMasterId]);

        await queryRunner.commitTransaction();
        logger.info(
          `[Product Cleanup] Merged master ${source.marketing_name} → ${target.marketing_name}: ` +
          `${offersMigrated} offers, ${imagesMigrated} images migrated`,
        );
        res.json({ success: true, data: { offersMigrated, imagesMigrated } });
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('[Product Cleanup] Error merging masters:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /operator/product-cleanup/fix-category
   * category 일괄 수정
   */
  router.patch('/fix-category', async (req: Request, res: Response): Promise<void> => {
    try {
      const { masterIds, categoryId } = req.body;
      if (!Array.isArray(masterIds) || !masterIds.length || !categoryId) {
        res.status(400).json({ success: false, error: 'MASTER_IDS_AND_CATEGORY_REQUIRED' });
        return;
      }

      // Verify category exists
      const [cat] = await dataSource.query(
        `SELECT id FROM product_categories WHERE id = $1`, [categoryId],
      );
      if (!cat) {
        res.status(404).json({ success: false, error: 'CATEGORY_NOT_FOUND' });
        return;
      }

      const result = await dataSource.query(
        `UPDATE product_masters SET category_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [categoryId, masterIds],
      );
      const updated = result?.[1] ?? 0;
      res.json({ success: true, data: { updated } });
    } catch (error) {
      logger.error('[Product Cleanup] Error fixing category:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /operator/product-cleanup/fix-brand
   * brand 일괄 수정
   */
  router.patch('/fix-brand', async (req: Request, res: Response): Promise<void> => {
    try {
      const { masterIds, brandId } = req.body;
      if (!Array.isArray(masterIds) || !masterIds.length || !brandId) {
        res.status(400).json({ success: false, error: 'MASTER_IDS_AND_BRAND_REQUIRED' });
        return;
      }

      // Verify brand exists
      const [brand] = await dataSource.query(
        `SELECT id FROM brands WHERE id = $1`, [brandId],
      );
      if (!brand) {
        res.status(404).json({ success: false, error: 'BRAND_NOT_FOUND' });
        return;
      }

      const result = await dataSource.query(
        `UPDATE product_masters SET brand_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [brandId, masterIds],
      );
      const updated = result?.[1] ?? 0;
      res.json({ success: true, data: { updated } });
    } catch (error) {
      logger.error('[Product Cleanup] Error fixing brand:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
