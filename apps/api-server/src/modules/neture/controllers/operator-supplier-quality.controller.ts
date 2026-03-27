/**
 * Operator Supplier Quality Report Controller
 *
 * WO-O4O-NETURE-SUPPLIER-QUALITY-REPORT-V1
 *
 * GET /api/v1/neture/operator/supplier-quality
 *   → 공급자별 업로드 품질 분석 (성공률, 실패율, 오류 유형)
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import logger from '../../../utils/logger.js';

export function createOperatorSupplierQualityController(dataSource: DataSource): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/supplier-quality
   * 공급자별 CSV import 품질 리포트
   * Query: ?from=2026-03-01&to=2026-03-31
   */
  router.get('/supplier-quality', async (req: Request, res: Response): Promise<void> => {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      // 1. 공급자별 집계 (batch + row 레벨)
      const supplierStats: Array<{
        supplier_id: string;
        supplier_name: string;
        batch_count: string;
        total_rows: string;
        applied_rows: string;
        failed_rows: string;
        retried_rows: string;
      }> = await dataSource.query(
        `SELECT
          b.supplier_id,
          COALESCE(s.business_name, s.contact_name, 'Unknown') AS supplier_name,
          COUNT(DISTINCT b.id)::text AS batch_count,
          COALESCE(SUM(b.total_rows), 0)::text AS total_rows,
          COALESCE(SUM(b.applied_rows), 0)::text AS applied_rows,
          COALESCE(SUM(b.rejected_rows), 0)::text AS rejected_rows,
          (SELECT COUNT(*)::text FROM supplier_csv_import_rows r2
           WHERE r2.batch_id = ANY(ARRAY_AGG(b.id)) AND r2.apply_status = 'failed'
          ) AS failed_rows,
          0::text AS retried_rows
        FROM supplier_csv_import_batches b
        LEFT JOIN neture_suppliers s ON s.id = b.supplier_id
        WHERE ($1::timestamp IS NULL OR b.created_at >= $1::timestamp)
          AND ($2::timestamp IS NULL OR b.created_at <= $2::timestamp + interval '1 day')
        GROUP BY b.supplier_id, s.business_name, s.contact_name
        ORDER BY SUM(b.total_rows) DESC`,
        [from || null, to || null],
      );

      // 2. 전체 오류 유형 TOP 10
      const topErrors: Array<{
        error_type: string;
        error_count: string;
      }> = await dataSource.query(
        `SELECT
          CASE
            WHEN r.apply_error ILIKE '%barcode%' OR r.apply_error ILIKE '%GTIN%' THEN 'barcode_error'
            WHEN r.apply_error ILIKE '%price%' THEN 'price_error'
            WHEN r.apply_error ILIKE '%NO_MASTER%' THEN 'master_not_found'
            WHEN r.apply_error ILIKE '%duplicate%' THEN 'duplicate_error'
            WHEN r.apply_error ILIKE '%MFDS%' THEN 'mfds_error'
            WHEN r.validation_error IS NOT NULL THEN 'validation_' || COALESCE(r.validation_error, 'unknown')
            ELSE COALESCE(SUBSTRING(r.apply_error FROM 1 FOR 50), 'unknown')
          END AS error_type,
          COUNT(*)::text AS error_count
        FROM supplier_csv_import_rows r
        JOIN supplier_csv_import_batches b ON b.id = r.batch_id
        WHERE (r.apply_status = 'failed' OR r.validation_status = 'REJECTED')
          AND ($1::timestamp IS NULL OR b.created_at >= $1::timestamp)
          AND ($2::timestamp IS NULL OR b.created_at <= $2::timestamp + interval '1 day')
        GROUP BY error_type
        ORDER BY COUNT(*) DESC
        LIMIT 10`,
        [from || null, to || null],
      );

      // 3. 전체 KPI 계산
      const totalRows = supplierStats.reduce((sum, s) => sum + parseInt(s.total_rows, 10), 0);
      const totalApplied = supplierStats.reduce((sum, s) => sum + parseInt(s.applied_rows, 10), 0);
      const totalFailed = supplierStats.reduce((sum, s) => sum + parseInt(s.failed_rows, 10), 0);
      const avgSuccessRate = totalRows > 0 ? totalApplied / totalRows : 0;

      // 4. 공급자별 데이터 정리
      const suppliers = supplierStats.map((s) => {
        const rows = parseInt(s.total_rows, 10);
        const applied = parseInt(s.applied_rows, 10);
        const failed = parseInt(s.failed_rows, 10);
        const successRate = rows > 0 ? applied / rows : 0;
        return {
          supplierId: s.supplier_id,
          supplierName: s.supplier_name,
          batchCount: parseInt(s.batch_count, 10),
          totalRows: rows,
          appliedRows: applied,
          failedRows: failed,
          successRate: Math.round(successRate * 10000) / 100, // percentage with 2 decimals
          grade: successRate >= 0.95 ? 'GOOD' : successRate >= 0.80 ? 'NORMAL' : 'BAD',
        };
      });

      res.json({
        success: true,
        data: {
          kpi: {
            totalSuppliers: suppliers.length,
            totalBatches: supplierStats.reduce((sum, s) => sum + parseInt(s.batch_count, 10), 0),
            totalRows,
            totalApplied,
            totalFailed,
            avgSuccessRate: Math.round(avgSuccessRate * 10000) / 100,
          },
          suppliers,
          topErrors: topErrors.map((e) => ({
            type: e.error_type,
            count: parseInt(e.error_count, 10),
          })),
        },
      });
    } catch (error) {
      logger.error('[Neture Operator] Supplier quality report error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate quality report' },
      });
    }
  });

  return router;
}
