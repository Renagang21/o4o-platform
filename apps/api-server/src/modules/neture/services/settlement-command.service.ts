import { NETURE_FULFILLMENT_SERVICE_KEY, netureOrderServiceScopeSql } from '../constants/fulfillment-service-scope.js';
import type { DataSource } from 'typeorm';
import { SettlementOrderConflictError } from './settlement-order-conflict.error.js';
import logger from '../../../utils/logger.js';
import { listSupplierOwnerUserIds } from '../middleware/supplier-context.resolver.js';
import { notificationService } from '../../../services/NotificationService.js';

const PLATFORM_FEE_RATE = 0.1;
const getPlatformFeeRate = () => PLATFORM_FEE_RATE;
const calculatePlatformFee = (total: number) => Math.round(total * PLATFORM_FEE_RATE);
const calculateSupplierAmount = (total: number, fee: number) => total - fee;

/** Existing settlement responsibility; public callers use NetureSettlementService. */
export class SettlementCommandService {
  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // Admin endpoints
  // ─────────────────────────────────────────────

  /**
   * 정산 일괄 계산 (배송 완료 + 결제/수금 확인 주문 기반)
   *
   * WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1
   * (상위: IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1)
   *
   * 정산 대상 = delivered AND payment/collection readiness (+ 미정산).
   * legacy 의 "delivered 만 보면 정산" 흐름은 일반 전자상거래 원칙과 맞지 않으므로 제거하고,
   * 결제(또는 명시적 수금) 확인된 주문만 정산 후보로 한다. sourceType/pricingSource 와 무관.
   *
   * readiness 판단 (§10.1 주의):
   *   delivered 주문은 status 가 'delivered' 로 덮여 'paid' 가 아니므로 status='paid' 는 쓰지 않는다.
   *   - paid_at IS NOT NULL                       : legacy online 결제 흔적(핸들러는 은퇴, 컬럼은 유지)
   *   - metadata.paymentStatus='paid'|paymentReady : checkout_order-origin / future bridge 주문
   *   - (제거됨) metadata.collectionStatus — WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1:
   *     정산은 PAID + DELIVERED 만 인정한다(후불·수금확인 예외 없음).
   * → 결제 확인 없이 delivered 만 된 주문(legacy 우회·테스트)은 정산에서 제외된다. (pre-launch: 0건이 정상)
   */
  async calculateSettlements(periodStart: string, periodEnd: string) {
    return this.dataSource.transaction(async (manager) => {
      // Calculation and cancellation serialize even for overlapping date ranges.
      await manager.query('SELECT pg_advisory_xact_lock(7410, 1)');
      // Find delivered AND payment/collection-ready orders not in any settlement, grouped by supplier
      const supplierAggregates = await manager.query(
        `WITH eligible_orders AS MATERIALIZED (
         SELECT o.* FROM neture_orders o
       WHERE o.status = 'delivered'
         AND (
           o.paid_at IS NOT NULL
           OR o.metadata->>'paymentStatus' = 'paid'
           OR o.metadata->>'paymentReady' = 'true'
           /* WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1: collectionStatus OR 제거(payment-first) */
         )
         AND o.updated_at >= $1::date
         AND o.updated_at < ($2::date + INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM neture_settlement_orders nso
           WHERE nso.order_id = o.id
         )
         -- WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1:
         --   공용 fulfillment 원장에는 여러 서비스 주문이 담긴다. Neture 정산은
         --   Neture 주문만 집계해야 한다(미표기 = neture). 다른 서비스 정산은 각자 축에서 처리한다.
         AND ${netureOrderServiceScopeSql('o', '$3')}
         ORDER BY o.id FOR UPDATE OF o
       )
       SELECT
         spo.supplier_id,
         ARRAY_AGG(DISTINCT o.id) AS order_ids,
         COUNT(DISTINCT o.id)::int AS order_count,
         SUM(oi.total_price)::int AS total_sales
       FROM eligible_orders o
       JOIN neture.neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       GROUP BY spo.supplier_id
       HAVING SUM(oi.total_price) > 0`,
        [periodStart, periodEnd, NETURE_FULFILLMENT_SERVICE_KEY],
      );

      if (supplierAggregates.length === 0) {
        return {
          success: true,
          data: { created: 0, settlements: [] },
          message: 'No unsettled, payment-ready delivered orders found in the given period.',
        };
      }

      // Detect the existing junction uniqueness violation before any financial rows are inserted.
      const ownerByOrder = new Map<string, string>();
      const conflictingOrders = new Set<string>();
      for (const aggregate of supplierAggregates) {
        for (const orderId of aggregate.order_ids as string[]) {
          const previousSupplier = ownerByOrder.get(orderId);
          if (previousSupplier !== undefined && previousSupplier !== aggregate.supplier_id) conflictingOrders.add(orderId);
          ownerByOrder.set(orderId, aggregate.supplier_id);
        }
      }
      if (conflictingOrders.size > 0) throw new SettlementOrderConflictError(conflictingOrders.size);

      const created: any[] = [];
      const feeRate = getPlatformFeeRate();

      for (const agg of supplierAggregates) {
        const totalSales = Number(agg.total_sales);
        const platformFee = calculatePlatformFee(totalSales);
        const supplierAmount = calculateSupplierAmount(totalSales, platformFee);
        const orderIds: string[] = agg.order_ids;

        const [settlement] = await manager.query(
          `INSERT INTO neture_settlements
           (supplier_id, period_start, period_end, total_sales, platform_fee,
            supplier_amount, platform_fee_rate, order_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calculated')
         RETURNING *`,
          [agg.supplier_id, periodStart, periodEnd, totalSales, platformFee, supplierAmount, feeRate, agg.order_count],
        );

        // Per-order supplier sales for the junction table
        const orderSales = await manager.query(
          `SELECT o.id AS order_id, SUM(oi.total_price)::int AS supplier_sales_amount
         FROM neture_orders o
         JOIN neture.neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE o.id = ANY($1::uuid[]) AND spo.supplier_id = $2
         GROUP BY o.id`,
          [orderIds, agg.supplier_id],
        );

        for (const os of orderSales) {
          await manager.query(
            `INSERT INTO neture_settlement_orders (settlement_id, order_id, supplier_sales_amount)
           VALUES ($1, $2, $3)`,
            [settlement.id, os.order_id, os.supplier_sales_amount],
          );
        }

        created.push(settlement);
      }

      logger.info(`[Neture Settlement] Created ${created.length} settlements for period ${periodStart} ~ ${periodEnd}`);

      return {
        success: true,
        data: { created: created.length, settlements: created },
      };
    });
  }

  /**
   * 정산 취소 (calculated/approved → cancelled)
   */
  async cancelSettlement(settlementId: string, notes?: string) {
    return this.dataSource.transaction(async (manager) => {
      // Calculation and cancellation serialize even for overlapping date ranges.
      await manager.query('SELECT pg_advisory_xact_lock(7410, 1)');
      const setClauses = ['status = $1', 'updated_at = NOW()'];
      const params: any[] = ['cancelled'];
      let paramIdx = 2;

      if (notes !== undefined) {
        setClauses.push(`notes = $${paramIdx}`);
        params.push(notes);
        paramIdx++;
      }

      params.push(settlementId);
      const result = await manager.query(
        `WITH changed AS (UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status IN ('calculated', 'approved')
       RETURNING *) SELECT * FROM changed`,
        params,
      );

      if (!result || result.length === 0) {
        return null;
      }

      // Delete junction rows to allow re-settlement
      await manager.query(`DELETE FROM neture_settlement_orders WHERE settlement_id = $1`, [settlementId]);

      return { success: true, data: result[0] };
    });
  }

  /**
   * 운영자 정산 승인 (calculated → approved)
   */
  async approveSettlement(settlementId: string, notes?: string) {
    const setClauses = ["status = 'approved'", 'approved_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await this.dataSource.query(
      `WITH changed AS (UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'calculated'
       RETURNING *) SELECT * FROM changed`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} approved`);
    return { success: true, data: result[0] };
  }

  /**
   * 운영자 정산 지급 처리 (approved → paid)
   */
  async paySettlement(settlementId: string, notes?: string) {
    const setClauses = ["status = 'paid'", 'paid_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await this.dataSource.query(
      `WITH changed AS (UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'approved'
       RETURNING *) SELECT * FROM changed`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} paid`);

    // WO-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1:
    // 정산 완료(approved → paid) 알림 — 단일 수신자(정산 대상 공급자 본인)에게 fire-and-forget.
    // 지급 성공 후에만 발송하고, 알림 실패가 지급 결과에 영향을 주지 않도록 try/catch. 금액·계좌 등은 metadata 에 넣지 않는다.
    await this.notifySupplierSettlementPaid(result[0]?.supplier_id, settlementId);

    return { success: true, data: result[0] };
  }

  /**
   * 정산 완료 알림 (fire-and-forget).
   * WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1: 수신자 = 공급자 사업자 본인 =
   *   현재 organization_members(owner) 전부. owner 가 없을 때만 legacy user_id fallback.
   * targetUrl 은 canonical `/supplier/settlements`(목록; 정산 상세 route 부재). 공급자는 활성 상태이므로 guard 통과.
   */
  private async notifySupplierSettlementPaid(
    supplierId: string | null | undefined,
    settlementId: string,
  ): Promise<void> {
    if (!supplierId) return;
    try {
      const recipients = await listSupplierOwnerUserIds(this.dataSource, supplierId);
      for (const userId of recipients) {
        await notificationService.createNotification({
          userId,
          // WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (B축 §11):
          //   legacy 'custom' → canonical 'settlement.paid' 수렴.
          //   새 notification transport 는 만들지 않고 기존 notificationService 를 그대로 쓴다.
          type: 'settlement.paid',
          title: '정산이 완료되었습니다',
          message: '정산 지급이 완료되었습니다. 정산 내역에서 확인해 주세요.',
          serviceKey: 'neture',
          metadata: { settlementId, status: 'paid', targetUrl: '/supplier/settlements' },
        });
      }
    } catch (err) {
      logger.warn('[Neture Settlement] Failed to send settlement-paid notification', err);
    }
  }
}
