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
 *   DELETE /pending-offers/:offerId — 승인 신청 상태 Offer 완전 삭제 (WO-NETURE-OPERATOR-PENDING-PRODUCT-HARD-DELETE-V1)
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
          ARRAY_AGG(pm.name ORDER BY pm.created_at ASC) AS names
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
          pm.name AS "name",
          pm.manufacturer_name AS "manufacturerName",
          pm.brand_name AS "brandName",
          pm.regulatory_type AS "regulatoryType",
          (SELECT COUNT(*)::int FROM supplier_product_offers spo WHERE spo.master_id = pm.id) AS "offerCount"
        FROM product_masters pm
        WHERE pm.category_id IS NULL
        ORDER BY pm.name ASC
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
          pm.name AS "name",
          pm.manufacturer_name AS "manufacturerName",
          pm.brand_name AS "brandName",
          pm.regulatory_type AS "regulatoryType",
          (SELECT COUNT(*)::int FROM supplier_product_offers spo WHERE spo.master_id = pm.id) AS "offerCount"
        FROM product_masters pm
        WHERE pm.brand_id IS NULL
        ORDER BY pm.name ASC
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
        `SELECT id, barcode, name FROM product_masters WHERE id = $1`, [sourceMasterId],
      );
      if (!source) {
        res.status(404).json({ success: false, error: 'SOURCE_MASTER_NOT_FOUND' });
        return;
      }
      const [target] = await dataSource.query(
        `SELECT id, barcode, name FROM product_masters WHERE id = $1`, [targetMasterId],
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
          `[Product Cleanup] Merged master ${source.name} → ${target.name}: ` +
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

  /**
   * DELETE /operator/product-cleanup/pending-offers/:offerId
   * 운영자: 승인 신청 상태 Offer 완전 삭제
   * WO-NETURE-OPERATOR-PENDING-PRODUCT-HARD-DELETE-V1
   */
  router.delete('/pending-offers/:offerId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId } = req.params;

      // 1. Offer 조회 + PENDING 상태 검증
      const [offer] = await dataSource.query(
        `SELECT id, approval_status AS "approvalStatus" FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
      if (!offer) {
        res.status(404).json({ success: false, error: 'OFFER_NOT_FOUND' });
        return;
      }
      if (offer.approvalStatus !== 'PENDING') {
        res.status(409).json({ success: false, error: 'NOT_PENDING' });
        return;
      }

      // 2. 승인된 서비스 승인 레코드 확인
      const [approvedCheck] = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM offer_service_approvals WHERE offer_id = $1 AND approval_status = 'approved'`,
        [offerId],
      );
      if (approvedCheck?.cnt > 0) {
        res.status(409).json({ success: false, error: 'HAS_APPROVED_SERVICE_APPROVALS' });
        return;
      }

      // 3. 활성 listing 확인
      const [listingCheck] = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM organization_product_listings WHERE offer_id = $1 AND is_active = true`,
        [offerId],
      );
      if (listingCheck?.cnt > 0) {
        res.status(409).json({ success: false, error: 'HAS_ACTIVE_LISTINGS' });
        return;
      }

      // 4. service_products 확인
      const [spCheck] = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM service_products WHERE offer_id = $1`,
        [offerId],
      );
      if (spCheck?.cnt > 0) {
        res.status(409).json({ success: false, error: 'HAS_SERVICE_PRODUCTS' });
        return;
      }

      // 5. 트랜잭션: 수동 정리 + Offer 삭제
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // 5a. spot_price_policies (No FK)
        await queryRunner.query(`DELETE FROM spot_price_policies WHERE offer_id = $1`, [offerId]);
        // 5b. Offer 삭제 (CASCADE: offer_service_approvals, product_approvals, listings, curations)
        await queryRunner.query(`DELETE FROM supplier_product_offers WHERE id = $1`, [offerId]);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }

      logger.info(`[Product Cleanup] Deleted pending offer ${offerId}`);
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      logger.error('[Product Cleanup] Error deleting pending offer:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== Soft Delete & Recycle Bin (WO-NETURE-APPROVED-PRODUCT-SOFT-DELETE-AND-RECYCLE-BIN-FLOW-V1) ====================

  /**
   * POST /operator/product-cleanup/soft-delete/:offerId
   * 승인된 상품을 soft 삭제 (운영 목록에서 제거)
   */
  router.post('/soft-delete/:offerId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId } = req.params;
      const userId = (req as any).user?.id;
      const { reason } = req.body || {};

      const offer = await dataSource.query(
        `SELECT id, approval_status, deleted_at FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
      if (!offer.length) {
        res.status(404).json({ success: false, error: 'OFFER_NOT_FOUND' });
        return;
      }
      if (offer[0].deleted_at) {
        res.status(400).json({ success: false, error: 'ALREADY_DELETED' });
        return;
      }

      await dataSource.query(
        `UPDATE supplier_product_offers SET deleted_at = NOW(), deleted_by = $1, delete_reason = $2, is_active = false WHERE id = $3`,
        [userId, reason || null, offerId],
      );

      logger.info(`[Product Cleanup] Soft-deleted offer ${offerId} by ${userId}`);
      res.json({ success: true, data: { softDeleted: true } });
    } catch (error) {
      logger.error('[Product Cleanup] Error soft-deleting offer:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /operator/product-cleanup/recycle-bin
   * Soft 삭제된 상품 목록 조회
   */
  router.get('/recycle-bin', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      const [rows, countResult] = await Promise.all([
        dataSource.query(`
          SELECT o.id, o.master_id, o.supplier_id, o.approval_status,
                 o.price_general, o.deleted_at, o.deleted_by, o.delete_reason,
                 m.name, m.barcode, m.regulatory_type,
                 s.company_name AS supplier_name,
                 u.name AS deleted_by_name
          FROM supplier_product_offers o
          JOIN product_masters m ON m.id = o.master_id
          LEFT JOIN neture_suppliers s ON s.id = o.supplier_id
          LEFT JOIN users u ON u.id = o.deleted_by
          WHERE o.deleted_at IS NOT NULL
          ORDER BY o.deleted_at DESC
          LIMIT $1 OFFSET $2
        `, [limit, offset]),
        dataSource.query(`
          SELECT COUNT(*)::int AS total FROM supplier_product_offers WHERE deleted_at IS NOT NULL
        `),
      ]);

      const total = countResult[0]?.total || 0;
      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('[Product Cleanup] Error fetching recycle bin:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /operator/product-cleanup/restore/:offerId
   * Soft 삭제 복구
   */
  router.post('/restore/:offerId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId } = req.params;
      const offer = await dataSource.query(
        `SELECT id, deleted_at FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
      if (!offer.length) {
        res.status(404).json({ success: false, error: 'OFFER_NOT_FOUND' });
        return;
      }
      if (!offer[0].deleted_at) {
        res.status(400).json({ success: false, error: 'NOT_DELETED' });
        return;
      }

      await dataSource.query(
        `UPDATE supplier_product_offers SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = $1`,
        [offerId],
      );

      logger.info(`[Product Cleanup] Restored offer ${offerId}`);
      res.json({ success: true, data: { restored: true } });
    } catch (error) {
      logger.error('[Product Cleanup] Error restoring offer:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * DELETE /operator/product-cleanup/hard-delete/:offerId
   * Soft 삭제 리스트에서만 가능한 완전 삭제
   */
  router.delete('/hard-delete/:offerId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId } = req.params;

      // soft 삭제된 상품만 완전 삭제 가능
      const offer = await dataSource.query(
        `SELECT id, deleted_at FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
      if (!offer.length) {
        res.status(404).json({ success: false, error: 'OFFER_NOT_FOUND' });
        return;
      }
      if (!offer[0].deleted_at) {
        res.status(400).json({ success: false, error: 'NOT_SOFT_DELETED', message: 'Hard delete is only allowed for soft-deleted offers' });
        return;
      }

      // 연결 데이터 확인
      const [listings, serviceProducts] = await Promise.all([
        dataSource.query(`SELECT COUNT(*)::int AS cnt FROM organization_product_listings WHERE offer_id = $1 AND is_active = true`, [offerId]),
        dataSource.query(`SELECT COUNT(*)::int AS cnt FROM service_products WHERE offer_id = $1`, [offerId]),
      ]);

      const blockReasons: string[] = [];
      if (listings[0]?.cnt > 0) blockReasons.push(`활성 매장 리스팅 ${listings[0].cnt}건`);
      if (serviceProducts[0]?.cnt > 0) blockReasons.push(`서비스 상품 ${serviceProducts[0].cnt}건`);

      if (blockReasons.length > 0) {
        res.status(409).json({
          success: false,
          error: 'HARD_DELETE_BLOCKED',
          message: `연결 데이터 존재: ${blockReasons.join(', ')}`,
          blockReasons,
        });
        return;
      }

      // 트랜잭션으로 완전 삭제
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(`DELETE FROM spot_price_policies WHERE offer_id = $1`, [offerId]);
        await queryRunner.query(`DELETE FROM supplier_product_offers WHERE id = $1`, [offerId]);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }

      logger.info(`[Product Cleanup] Hard-deleted offer ${offerId} from recycle bin`);
      res.json({ success: true, data: { hardDeleted: true } });
    } catch (error) {
      logger.error('[Product Cleanup] Error hard-deleting offer:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
