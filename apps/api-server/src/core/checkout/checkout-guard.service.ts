/**
 * CheckoutGuardService
 *
 * WO-O4O-CHECKOUT-GUARD-ORGANIZATION-LEVEL-V1
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 전환
 * WO-NETURE-DISTRIBUTION-TIER-REALIGN-BETA-V1: SERVICE + PRIVATE Tier 검증
 *
 * Organization-level supply contract verification at checkout time.
 *
 * Distribution Security Tier:
 *   Tier 1 (PUBLIC)  — 승인 불필요, checkout 가드 없음
 *   Tier 2 (SERVICE) — SERVICE approval 필요, checkout 시 검증
 *   Tier 3 (PRIVATE) — PRIVATE approval 필요, checkout 시 검증
 *
 * Logic:
 * - organization_id에 대해 product_approvals (SERVICE + PRIVATE) 레코드 조회
 * - 계약 레코드 없음 → 허용 (Neture 무관 판매자 또는 PUBLIC 전용)
 * - approved 계약 존재 → 허용
 * - 계약 존재하지만 approved 없음 → 차단
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
 * Checks both SERVICE (Tier 2) and PRIVATE (Tier 3) approval records.
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
    // Check SERVICE + PRIVATE approval records for this seller
    const records: Array<{ status: string }> = await dataSource.query(
      `SELECT approval_status AS status FROM product_approvals
       WHERE organization_id = $1 AND approval_type IN ('PRIVATE', 'service')
       LIMIT 20`,
      [sellerId],
    );

    // No contract records → allow (not a Neture-related seller or PUBLIC-only)
    if (records.length === 0) {
      return { allowed: true };
    }

    // Check if at least one approved contract exists (SERVICE or PRIVATE)
    const hasApproved = records.some((r) => r.status === 'approved');

    if (hasApproved) {
      return { allowed: true };
    }

    // Contract records exist but none approved → block
    logger.warn('[CheckoutGuard] Seller blocked: no approved approval (SERVICE/PRIVATE)', {
      sellerId,
      existingStatuses: records.map((r) => r.status),
    });

    return {
      allowed: false,
      reason: '공급 계약이 승인되지 않았습니다. 공급자에게 문의하세요.',
      code: 'SUPPLY_CONTRACT_NOT_APPROVED',
    };
  } catch (error) {
    // If product_approvals table doesn't exist, allow (graceful degradation)
    const err = error as Error;
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      logger.warn('[CheckoutGuard] product_approvals table not found, allowing checkout');
      return { allowed: true };
    }

    logger.error('[CheckoutGuard] Validation error:', err);
    // On unexpected errors, allow to avoid blocking checkout
    return { allowed: true };
  }
}
