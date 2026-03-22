/**
 * SupplierSettlementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (lines 3683-3922)
 *
 * Routes:
 *   GET  /settlements           — 공급자 정산 목록 (페이지네이션 + 상태 필터)
 *   GET  /settlements/kpi       — 정산 KPI (대시보드용)
 *   GET  /settlements/:id       — 공급자 정산 상세 (연결된 주문 포함)
 *   GET  /partner-commissions   — 공급자의 파트너 커미션 정책 목록
 *   POST /partner-commissions   — 커미션 정책 생성 (기간 겹침 검증)
 *   PUT  /partner-commissions/:id  — 커미션 정책 수정 (기간 겹침 검증)
 *   DELETE /partner-commissions/:id — 커미션 정책 삭제 (사용된 정책 삭제 불가)
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureSettlementService } from '../services/neture-settlement.service.js';
import { PartnerCommissionService } from '../services/partner-commission.service.js';
import logger from '../../../utils/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSupplierSettlementController(dataSource: DataSource): Router {
  const router = Router();
  const settlementService = new NetureSettlementService(dataSource);
  const commissionService = new PartnerCommissionService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // ==================== Settlement Engine (WO-O4O-SETTLEMENT-ENGINE-V1) ====================

  /**
   * GET /settlements
   * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 목록 (페이지네이션 + 상태 필터)
   */
  router.get('/settlements', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await settlementService.getSupplierSettlements(supplierId, { page, limit, status });
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlements' });
    }
  });

  /**
   * GET /settlements/kpi
   * WO-O4O-SETTLEMENT-ENGINE-V1: 정산 KPI (대시보드용)
   * NOTE: /kpi must be registered BEFORE /:id
   */
  router.get('/settlements/kpi', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await settlementService.getSupplierKpi(supplierId);
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching settlement KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement KPI' });
    }
  });

  /**
   * GET /settlements/:id
   * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 상세 (연결된 주문 포함)
   */
  router.get('/settlements/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const settlementId = req.params.id;

      if (!UUID_REGEX.test(settlementId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid settlement ID format' });
      }

      const result = await settlementService.getSupplierSettlementDetail(settlementId, supplierId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement detail' });
    }
  });

  // ==================== Supplier Partner Commission Manager (WO-O4O-SUPPLIER-COMMISSION-MANAGER-V1) ====================

  /**
   * GET /partner-commissions
   * 공급자의 파트너 커미션 정책 목록
   */
  router.get('/partner-commissions', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;

      const rows = await dataSource.query(
        `SELECT spc.id, spc.supplier_product_id, spc.commission_per_unit,
                spc.start_date, spc.end_date, spc.created_at,
                COALESCE(pm.marketing_name, 'Unknown') AS product_name,
                pm.barcode
         FROM supplier_partner_commissions spc
         JOIN supplier_product_offers spo ON spo.id = spc.supplier_product_id
         LEFT JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.supplier_id = $1
         ORDER BY spc.start_date DESC`,
        [supplierId],
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier partner commissions:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /partner-commissions
   * 커미션 정책 생성 (기간 겹침 검증)
   */
  router.post('/partner-commissions', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { supplier_product_id, commission_per_unit, start_date, end_date } = req.body;

      if (!supplier_product_id || commission_per_unit == null || !start_date) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'supplier_product_id, commission_per_unit, start_date required' });
      }

      // Verify product belongs to this supplier
      const [product] = await dataSource.query(
        `SELECT id FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2`,
        [supplier_product_id, supplierId],
      );
      if (!product) {
        return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found or not owned by supplier' });
      }

      // Check date overlap
      const overlaps = await dataSource.query(
        `SELECT id FROM supplier_partner_commissions
         WHERE supplier_product_id = $1
           AND (
             ($2::date <= COALESCE(end_date, '9999-12-31'::date))
             AND (COALESCE($3::date, '9999-12-31'::date) >= start_date)
           )`,
        [supplier_product_id, start_date, end_date || null],
      );
      if (overlaps.length > 0) {
        return res.status(409).json({ success: false, error: 'DATE_OVERLAP', message: 'Commission period overlaps with existing policy' });
      }

      const [created] = await dataSource.query(
        `INSERT INTO supplier_partner_commissions (supplier_product_id, commission_per_unit, start_date, end_date)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [supplier_product_id, commission_per_unit, start_date, end_date || null],
      );

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('[Neture API] Error creating supplier partner commission:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PUT /partner-commissions/:id
   * 커미션 정책 수정 (기간 겹침 검증)
   */
  router.put('/partner-commissions/:id', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const commissionId = req.params.id;
      const { commission_per_unit, start_date, end_date } = req.body;

      // Find existing and verify ownership
      const [existing] = await dataSource.query(
        `SELECT spc.id, spc.supplier_product_id
         FROM supplier_partner_commissions spc
         JOIN supplier_product_offers spo ON spo.id = spc.supplier_product_id
         WHERE spc.id = $1 AND spo.supplier_id = $2`,
        [commissionId, supplierId],
      );
      if (!existing) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }

      // Check date overlap (exclude self)
      if (start_date) {
        const overlaps = await dataSource.query(
          `SELECT id FROM supplier_partner_commissions
           WHERE supplier_product_id = $1 AND id != $2
             AND (
               ($3::date <= COALESCE(end_date, '9999-12-31'::date))
               AND (COALESCE($4::date, '9999-12-31'::date) >= start_date)
             )`,
          [existing.supplier_product_id, commissionId, start_date, end_date || null],
        );
        if (overlaps.length > 0) {
          return res.status(409).json({ success: false, error: 'DATE_OVERLAP', message: 'Commission period overlaps with existing policy' });
        }
      }

      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (commission_per_unit != null) { sets.push(`commission_per_unit = $${idx++}`); params.push(commission_per_unit); }
      if (start_date) { sets.push(`start_date = $${idx++}`); params.push(start_date); }
      if (end_date !== undefined) { sets.push(`end_date = $${idx++}`); params.push(end_date || null); }

      if (sets.length === 0) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'No fields to update' });
      }

      params.push(commissionId);
      const [updated] = await dataSource.query(
        `UPDATE supplier_partner_commissions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params,
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[Neture API] Error updating supplier partner commission:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * DELETE /partner-commissions/:id
   * 커미션 정책 삭제 (이미 사용된 정책은 삭제 불가)
   */
  router.delete('/partner-commissions/:id', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const commissionId = req.params.id;

      // Verify ownership
      const [existing] = await dataSource.query(
        `SELECT spc.id, spc.supplier_product_id
         FROM supplier_partner_commissions spc
         JOIN supplier_product_offers spo ON spo.id = spc.supplier_product_id
         WHERE spc.id = $1 AND spo.supplier_id = $2`,
        [commissionId, supplierId],
      );
      if (!existing) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }

      // Check if policy has been used (partner_commissions referencing this product)
      const [usage] = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM partner_commissions WHERE product_id = $1`,
        [existing.supplier_product_id],
      );
      if (usage.cnt > 0) {
        return res.status(409).json({ success: false, error: 'IN_USE', message: 'Cannot delete: commissions have been earned under this policy' });
      }

      await dataSource.query(`DELETE FROM supplier_partner_commissions WHERE id = $1`, [commissionId]);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error deleting supplier partner commission:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
