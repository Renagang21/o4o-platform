/**
 * Order Canonical Table Diagnostic Endpoint
 *
 * WO-O4O-ORDER-CANONICAL-TABLE-DIAGNOSTIC-ENDPOINT-V1
 *
 * 임시 진단 엔드포인트. GET /__debug__/order-canonical-table
 * 목적: 운영 DB 에서 주문 canonical table(checkout_orders vs ecommerce_orders) 상태를
 *       read-only 로 실측하여 IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1 의 미확인 항목
 *       (테이블 실재 여부 + checkout_orders serviceKey row 분포 = H1/H2 판단)을 닫는다.
 *
 * 제약:
 * - Platform admin 인증 필수 (authenticate + requireAdmin: platform:admin / platform:super_admin)
 * - SELECT / information_schema 만 실행 (INSERT/UPDATE/DELETE/ALTER/CREATE/DROP 절대 금지)
 * - PII 미조회: 주문 상세 row(buyerId/recipient/phone/email/items/shippingAddress) 반환 안 함
 * - count / column 메타 / serviceKey·status group 집계만 반환
 * - 없는 테이블(ecommerce_orders)은 endpoint 를 실패시키지 않고 exists:false 로 반환
 * - 실측 후 본 endpoint 는 제거 또는 비공개 유지 여부를 별도 결정
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';

interface TableDiag {
  exists: boolean;
  rowCount: number | null;
  columns: string[];
}

export function createOrderCanonicalTableDiagnosticRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', authenticate as any, requireAdmin as any, async (req: Request, res: Response): Promise<void> => {
    const base = {
      timestamp: new Date().toISOString(),
      warning: 'READ-ONLY diagnostic endpoint. No data is modified. No PII returned.',
      purpose: 'WO-O4O-ORDER-CANONICAL-TABLE-DIAGNOSTIC-ENDPOINT-V1',
    };

    if (!dataSource.isInitialized) {
      res.status(503).json({ ...base, error: 'Database not initialized yet', code: 'DB_NOT_READY' });
      return;
    }

    try {
      // ── table existence + column metadata (information_schema) ──
      const existenceRows: Array<{ table_name: string }> = await dataSource.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN ('checkout_orders', 'ecommerce_orders')`,
      );
      const present = new Set(existenceRows.map((r) => r.table_name));

      // column metadata only (column names — not data)
      const columnRows: Array<{ table_name: string; column_name: string }> = await dataSource.query(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name IN ('checkout_orders', 'ecommerce_orders')
         ORDER BY table_name, ordinal_position`,
      );
      const columnsOf = (t: string): string[] =>
        columnRows.filter((r) => r.table_name === t).map((r) => r.column_name);

      // ── helper: safe count (only when table exists) ──
      const safeCount = async (table: 'checkout_orders' | 'ecommerce_orders'): Promise<number | null> => {
        if (!present.has(table)) return null;
        const [row] = await dataSource.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
        return row?.count ?? 0;
      };

      const checkoutOrders: TableDiag = {
        exists: present.has('checkout_orders'),
        rowCount: await safeCount('checkout_orders'),
        columns: columnsOf('checkout_orders'),
      };
      const ecommerceOrders: TableDiag = {
        exists: present.has('ecommerce_orders'),
        rowCount: await safeCount('ecommerce_orders'),
        columns: columnsOf('ecommerce_orders'),
      };

      // ── checkout_orders aggregates (serviceKey / status), no PII ──
      let serviceKeyCounts: Array<{ serviceKey: string | null; count: number }> = [];
      let statusCounts: Array<{ status: string | null; count: number }> = [];
      let serviceKeyStatusCounts: Array<{ serviceKey: string | null; status: string | null; count: number }> = [];

      if (checkoutOrders.exists) {
        serviceKeyCounts = await dataSource.query(
          `SELECT metadata->>'serviceKey' AS "serviceKey", COUNT(*)::int AS count
           FROM checkout_orders
           GROUP BY metadata->>'serviceKey'
           ORDER BY COUNT(*) DESC NULLS LAST`,
        );
        statusCounts = await dataSource.query(
          `SELECT status, COUNT(*)::int AS count
           FROM checkout_orders
           GROUP BY status
           ORDER BY COUNT(*) DESC`,
        );
        serviceKeyStatusCounts = await dataSource.query(
          `SELECT metadata->>'serviceKey' AS "serviceKey", status, COUNT(*)::int AS count
           FROM checkout_orders
           GROUP BY metadata->>'serviceKey', status
           ORDER BY "serviceKey" NULLS LAST, status`,
        );
      }

      // ── ecommerce_orders aggregates only if it exists (avoid 42P01) ──
      let ecommerceServiceKeyCounts: Array<{ serviceKey: string | null; count: number }> | null = null;
      if (ecommerceOrders.exists) {
        // metadata column may or may not exist; guard by column presence
        if (ecommerceOrders.columns.includes('metadata')) {
          ecommerceServiceKeyCounts = await dataSource.query(
            `SELECT metadata->>'serviceKey' AS "serviceKey", COUNT(*)::int AS count
             FROM ecommerce_orders
             GROUP BY metadata->>'serviceKey'
             ORDER BY COUNT(*) DESC NULLS LAST`,
          );
        }
      }

      // ── diagnosis (H1 / H2) ──
      const ecommerceOrdersExists = ecommerceOrders.exists;
      const recommendedBranch = ecommerceOrdersExists ? 'H2' : 'H1';
      const diagnosis = {
        canonicalTable: 'checkout_orders',
        checkoutOrdersExists: checkoutOrders.exists,
        ecommerceOrdersExists,
        recommendedBranch,
        note: ecommerceOrdersExists
          ? 'H2: ecommerce_orders EXISTS in production. Aligning service create→checkout_orders may regress working flows; confirm where real orders/payments live before realigning.'
          : 'H1: ecommerce_orders ABSENT. GP/K-Cos create+payment paths (EcommerceOrder) are non-functional against prod; realign create+payment+list together to checkout_orders.',
      };

      res.json({
        ...base,
        tables: {
          checkout_orders: checkoutOrders,
          ecommerce_orders: ecommerceOrders,
        },
        checkoutOrders: {
          serviceKeyCounts,
          statusCounts,
          serviceKeyStatusCounts,
        },
        ecommerceOrders: {
          serviceKeyCounts: ecommerceServiceKeyCounts,
        },
        diagnosis,
      });
    } catch (error: any) {
      res.status(500).json({
        ...base,
        error: error?.message ?? 'diagnostic query failed',
        code: 'ORDER_CANONICAL_DIAG_FAILED',
      });
    }
  });

  return router;
}
