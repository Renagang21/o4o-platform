/**
 * OfferServicePriceService — WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1
 *
 * 서비스별 공급가(offer_service_prices) CRUD.
 * - price_general 은 기본/ fallback 으로 불변. 서비스별 가격은 별도 SSOT.
 * - 주문 단가 우선순위(주문 경로에서 적용): event_price > offer_service_prices.unit_price > price_general > legacy opl.price.
 * - serviceKey 는 승인 대상 키 SSOT(filterApprovalEligibleServiceKeys)만 허용.
 */

import type { DataSource } from 'typeorm';
import { filterApprovalEligibleServiceKeys } from '../constants/approval-service-keys.js';
import logger from '../../../utils/logger.js';

export interface ServicePriceInput {
  serviceKey: string;
  unitPrice: number;
}

export class OfferServicePriceService {
  constructor(private readonly dataSource: DataSource) {}

  /** 공급자 소유 offer 인지 확인 + price_general 반환 */
  private async loadOwnedOffer(offerId: string, supplierId: string): Promise<{ priceGeneral: number } | null> {
    const [offer] = await this.dataSource.query(
      `SELECT supplier_id, price_general FROM supplier_product_offers WHERE id = $1 AND deleted_at IS NULL`,
      [offerId],
    );
    if (!offer || offer.supplier_id !== supplierId) return null;
    return { priceGeneral: Number(offer.price_general) };
  }

  /** 공급자 소유 확인 + offer 의 서비스별 가격 목록(+price_general) */
  async getByOfferForSupplier(
    offerId: string,
    supplierId: string,
  ): Promise<{ success: boolean; error?: string; data?: { priceGeneral: number; prices: Array<{ serviceKey: string; unitPrice: number }> } }> {
    const owned = await this.loadOwnedOffer(offerId, supplierId);
    if (!owned) return { success: false, error: 'NOT_OWNED' };
    const prices = await this.getByOffer(offerId);
    return { success: true, data: { priceGeneral: owned.priceGeneral, prices } };
  }

  /** offer 의 서비스별 가격 목록 (소유권 미검증 — 주문/내부용) */
  async getByOffer(offerId: string): Promise<Array<{ serviceKey: string; unitPrice: number }>> {
    const rows: Array<{ service_key: string; unit_price: number }> = await this.dataSource.query(
      `SELECT service_key, unit_price FROM offer_service_prices WHERE offer_id = $1 ORDER BY service_key`,
      [offerId],
    );
    return rows.map((r) => ({ serviceKey: r.service_key, unitPrice: Number(r.unit_price) }));
  }

  /**
   * 서비스별 가격 일괄 설정(replace) — 제공된 목록으로 교체.
   *   - eligible serviceKey + unitPrice 정수 > 0 검증.
   *   - 목록에 없는 기존 service_key 는 삭제(가격 해제).
   *   - 트랜잭션.
   */
  async setPrices(
    offerId: string,
    supplierId: string,
    items: ServicePriceInput[],
  ): Promise<{ success: boolean; error?: string; data?: { prices: Array<{ serviceKey: string; unitPrice: number }> } }> {
    const owned = await this.loadOwnedOffer(offerId, supplierId);
    if (!owned) return { success: false, error: 'NOT_OWNED' };

    // eligible 키만 + 정규화
    const eligible = new Set(filterApprovalEligibleServiceKeys(items.map((i) => i.serviceKey)));
    const normalized: ServicePriceInput[] = [];
    for (const it of items) {
      if (!eligible.has(it.serviceKey)) continue; // 비-eligible 키 무시
      const price = Number(it.unitPrice);
      if (!Number.isInteger(price) || price <= 0) {
        return { success: false, error: 'INVALID_PRICE' };
      }
      normalized.push({ serviceKey: it.serviceKey, unitPrice: price });
    }

    const keepKeys = normalized.map((n) => n.serviceKey);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 목록에 없는 기존 가격 삭제
      if (keepKeys.length) {
        await queryRunner.query(
          `DELETE FROM offer_service_prices WHERE offer_id = $1 AND service_key <> ALL($2::text[])`,
          [offerId, keepKeys],
        );
      } else {
        await queryRunner.query(`DELETE FROM offer_service_prices WHERE offer_id = $1`, [offerId]);
      }
      // upsert
      for (const n of normalized) {
        await queryRunner.query(
          `INSERT INTO offer_service_prices (offer_id, service_key, unit_price, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (offer_id, service_key) DO UPDATE SET unit_price = EXCLUDED.unit_price, updated_at = NOW()`,
          [offerId, n.serviceKey, n.unitPrice],
        );
      }
      await queryRunner.commitTransaction();
      logger.info(`[OfferServicePrice] setPrices offer ${offerId}: ${normalized.map((n) => `${n.serviceKey}=${n.unitPrice}`).join(',') || '(none)'}`);
      return { success: true, data: { prices: normalized } };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
