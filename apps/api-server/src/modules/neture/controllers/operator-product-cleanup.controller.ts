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
import { ProductCleanupOperationsService } from '../services/product-cleanup-operations.service.js';
import { OperationError } from '../../../services/operations/operation-audit.js';
import { ProductTrashBatchService } from '../services/product-trash-batch.service.js';
import logger from '../../../utils/logger.js';

export function createOperatorProductCleanupController(dataSource: DataSource): Router {
  const router = Router();
  const operations = new ProductCleanupOperationsService(dataSource);
  const trash = new ProductTrashBatchService(dataSource);
  const adminOnly = requireNetureScope('neture:admin') as any;
  const mutation = (run: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await run(req) }); }
    catch (error) {
      if (error instanceof OperationError) { res.status(error.status).json({ success: false, error: error.code, message: error.message }); return; }
      logger.error('[Product Cleanup] Mutation failed', { code: (error as any)?.code });
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  };

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
  router.post('/merge-masters', adminOnly, mutation(req => operations.merge(req.body?.sourceMasterId, req.body?.targetMasterId, (req as any).user.id, req.body?.reason)));

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
  router.delete('/pending-offers/:offerId', adminOnly, mutation(req => operations.remove(req.params.offerId, 'pending', (req as any).user.id, req.body?.reason)));

  // ==================== Soft Delete & Recycle Bin (WO-NETURE-APPROVED-PRODUCT-SOFT-DELETE-AND-RECYCLE-BIN-FLOW-V1) ====================

  /**
   * POST /operator/product-cleanup/soft-delete/:offerId
   * 승인된 상품을 soft 삭제 (운영 목록에서 제거)
   */
  router.post('/soft-delete/:offerId', mutation(req => operations.changeTrash(req.params.offerId, (req as any).user.id, false, req.body?.reason)));

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
                 -- 공급자 표시명 SSOT = organizations.name (neture_suppliers 에 상호 컬럼 없음)
                 supplier_org.name AS supplier_name,
                 u.name AS deleted_by_name
          FROM supplier_product_offers o
          JOIN product_masters m ON m.id = o.master_id
          LEFT JOIN neture_suppliers s ON s.id = o.supplier_id
          LEFT JOIN organizations supplier_org ON supplier_org.id = s.organization_id
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
  router.post('/restore/:offerId', mutation(req => operations.changeTrash(req.params.offerId, (req as any).user.id, true)));

  /**
   * DELETE /operator/product-cleanup/hard-delete/:offerId
   * Soft 삭제 리스트에서만 가능한 완전 삭제
   */
  router.delete('/hard-delete/:offerId', adminOnly, mutation(req => operations.remove(req.params.offerId, 'trash', (req as any).user.id, req.body?.reason)));

  router.post('/batch-soft-delete', mutation(req => trash.move(req.body?.ids, (req as any).user.id)));
  router.post('/empty-trash/preview', adminOnly, mutation(req => trash.preview((req as any).user.id)));
  router.post('/empty-trash/execute', adminOnly, mutation(req => trash.empty((req as any).user.id, req.body)));

  return router;
}
