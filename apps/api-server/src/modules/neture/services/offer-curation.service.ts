/**
 * OfferCurationService
 *
 * 큐레이션 CRUD: 승인된 Offer 중 operator가 노출 선택
 *
 * WO-NETURE-PRODUCT-CURATION-V1
 */

import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

const VALID_PLACEMENTS = ['featured', 'category', 'banner'];

export class OfferCurationService {
  constructor(private dataSource: DataSource) {}

  /**
   * 큐레이션 목록 조회 (JOIN으로 상품 정보 포함)
   */
  async listCurations(filters: { serviceKey?: string; placement?: string } = {}) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.serviceKey) {
      conditions.push(`oc.service_key = $${idx}`);
      params.push(filters.serviceKey);
      idx++;
    }
    if (filters.placement) {
      conditions.push(`oc.placement = $${idx}`);
      params.push(filters.placement);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.dataSource.query(
      `SELECT
         oc.id, oc.offer_id AS "offerId", oc.service_key AS "serviceKey",
         oc.placement, oc.category_id AS "categoryId",
         oc.position, oc.is_active AS "isActive",
         oc.start_at AS "startAt", oc.end_at AS "endAt",
         oc.created_at AS "createdAt", oc.updated_at AS "updatedAt",
         COALESCE(pm.marketing_name, pm.regulatory_name, '') AS "productName",
         pm.barcode,
         COALESCE(b.name, pm.brand_name) AS "brandName",
         spo.price_general AS "priceGeneral",
         spo.distribution_type AS "distributionType",
         spo.approval_status AS "approvalStatus",
         pc.name AS "categoryName"
       FROM offer_curations oc
       JOIN supplier_product_offers spo ON spo.id = oc.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_brands b ON b.id = pm.brand_id
       LEFT JOIN product_categories pc ON pc.id = oc.category_id
       ${where}
       ORDER BY oc.placement, oc.position ASC`,
      params,
    );

    return rows;
  }

  /**
   * 큐레이션 등록 (APPROVED Offer만 허용)
   */
  async createCuration(data: {
    offerId: string;
    serviceKey: string;
    placement: string;
    categoryId?: string | null;
    position?: number;
    isActive?: boolean;
    startAt?: string | null;
    endAt?: string | null;
  }) {
    if (!VALID_PLACEMENTS.includes(data.placement)) {
      return { success: false, error: 'INVALID_PLACEMENT' };
    }

    // Verify offer is APPROVED
    const [offer] = await this.dataSource.query(
      `SELECT id, approval_status FROM supplier_product_offers WHERE id = $1`,
      [data.offerId],
    );
    if (!offer) {
      return { success: false, error: 'OFFER_NOT_FOUND' };
    }
    if (offer.approval_status !== 'APPROVED') {
      return { success: false, error: 'OFFER_NOT_APPROVED', message: '승인된 상품만 큐레이션 등록 가능합니다.' };
    }

    try {
      const [row] = await this.dataSource.query(
        `INSERT INTO offer_curations (offer_id, service_key, placement, category_id, position, is_active, start_at, end_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, offer_id AS "offerId", service_key AS "serviceKey", placement,
                   category_id AS "categoryId", position, is_active AS "isActive",
                   start_at AS "startAt", end_at AS "endAt",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          data.offerId,
          data.serviceKey,
          data.placement,
          data.categoryId || null,
          data.position ?? 0,
          data.isActive !== false,
          data.startAt || null,
          data.endAt || null,
        ],
      );
      logger.info(`[OfferCuration] Created curation ${row.id} for offer ${data.offerId}`);
      return { success: true, data: row };
    } catch (err: any) {
      if (err.code === '23505') {
        return { success: false, error: 'DUPLICATE_CURATION', message: '이미 등록된 큐레이션입니다.' };
      }
      throw err;
    }
  }

  /**
   * 큐레이션 수정
   */
  async updateCuration(
    id: string,
    updates: {
      placement?: string;
      categoryId?: string | null;
      position?: number;
      isActive?: boolean;
      startAt?: string | null;
      endAt?: string | null;
    },
  ) {
    if (updates.placement && !VALID_PLACEMENTS.includes(updates.placement)) {
      return { success: false, error: 'INVALID_PLACEMENT' };
    }

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [id];
    let idx = 2;

    if (updates.placement !== undefined) { sets.push(`placement = $${idx}`); params.push(updates.placement); idx++; }
    if (updates.categoryId !== undefined) { sets.push(`category_id = $${idx}`); params.push(updates.categoryId); idx++; }
    if (updates.position !== undefined) { sets.push(`position = $${idx}`); params.push(updates.position); idx++; }
    if (updates.isActive !== undefined) { sets.push(`is_active = $${idx}`); params.push(updates.isActive); idx++; }
    if (updates.startAt !== undefined) { sets.push(`start_at = $${idx}`); params.push(updates.startAt); idx++; }
    if (updates.endAt !== undefined) { sets.push(`end_at = $${idx}`); params.push(updates.endAt); idx++; }

    const result = await this.dataSource.query(
      `UPDATE offer_curations SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, offer_id AS "offerId", service_key AS "serviceKey", placement,
                 category_id AS "categoryId", position, is_active AS "isActive",
                 start_at AS "startAt", end_at AS "endAt"`,
      params,
    );

    if (!result.length) {
      return { success: false, error: 'CURATION_NOT_FOUND' };
    }
    return { success: true, data: result[0] };
  }

  /**
   * 큐레이션 삭제
   */
  async deleteCuration(id: string) {
    const result = await this.dataSource.query(
      `DELETE FROM offer_curations WHERE id = $1 RETURNING id`,
      [id],
    );
    if (!result.length) {
      return { success: false, error: 'CURATION_NOT_FOUND' };
    }
    return { success: true };
  }

  /**
   * 순서 재정렬: ids 배열 순서대로 position 설정
   */
  async reorderCurations(ids: string[]) {
    for (let i = 0; i < ids.length; i++) {
      await this.dataSource.query(
        `UPDATE offer_curations SET position = $1, updated_at = NOW() WHERE id = $2`,
        [i, ids[i]],
      );
    }
    return { success: true };
  }
}
