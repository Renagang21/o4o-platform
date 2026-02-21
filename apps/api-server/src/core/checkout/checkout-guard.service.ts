/**
 * CheckoutGuardService
 *
 * WO-O4O-CHECKOUT-GUARD-ORGANIZATION-LEVEL-V1
 *
 * Organization-level supply contract verification at checkout time.
 *
 * Logic:
 * - seller_id에 대해 neture_supplier_requests 레코드 조회
 * - 계약 레코드 없음 → 허용 (Neture 무관 판매자)
 * - APPROVED 계약 존재 → 허용
 * - 계약 존재하지만 APPROVED 없음 → 차단
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';

export interface CheckoutGuardResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

/**
 * Validate that a seller has an active supply relationship.
 *
 * @param dataSource - TypeORM DataSource
 * @param sellerId - The seller (pharmacy/store) UUID
 * @returns CheckoutGuardResult
 */
export async function validateSupplierSellerRelation(
  dataSource: DataSource,
  sellerId: string,
): Promise<CheckoutGuardResult> {
  try {
    // Check if any supply contract records exist for this seller
    const records: Array<{ status: string }> = await dataSource.query(
      `SELECT status FROM neture_supplier_requests
       WHERE seller_id = $1
       LIMIT 10`,
      [sellerId],
    );

    // No contract records → allow (not a Neture-related seller)
    if (records.length === 0) {
      return { allowed: true };
    }

    // Check if at least one APPROVED contract exists
    const hasApproved = records.some((r) => r.status === 'approved');

    if (hasApproved) {
      return { allowed: true };
    }

    // Contract records exist but none APPROVED → block
    logger.warn('[CheckoutGuard] Seller blocked: no approved supply contract', {
      sellerId,
      existingStatuses: records.map((r) => r.status),
    });

    return {
      allowed: false,
      reason: '공급 계약이 승인되지 않았습니다. 공급자에게 문의하세요.',
      code: 'SUPPLY_CONTRACT_NOT_APPROVED',
    };
  } catch (error) {
    // If neture_supplier_requests table doesn't exist, allow (graceful degradation)
    const err = error as Error;
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      logger.warn('[CheckoutGuard] neture_supplier_requests table not found, allowing checkout');
      return { allowed: true };
    }

    logger.error('[CheckoutGuard] Validation error:', err);
    // On unexpected errors, allow to avoid blocking checkout
    return { allowed: true };
  }
}
