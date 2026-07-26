/**
 * Product AI Access Utilities — WO-O4O-STORE-AI-PRODUCT-ORG-GUARD-V1
 *
 * Organization ownership verification for product AI endpoints.
 *
 * Access policy:
 *   1. Platform admin / operator role → bypass org check (unrestricted)
 *   2. User with organization membership → verified via organization_product_listings
 *   3. No org membership → denied (403)
 *
 * Canonical ownership source: organization_product_listings
 *   opl.organization_id = user's org
 *   spo.master_id = productId  (supplier_product_offers.master_id → product_masters.id)
 */

import type { DataSource } from 'typeorm';

// WO-O4O-ADMIN-LEGACY-SUPER-ADMIN-NOOP-CLEANUP-V1:
//   role_assignments 를 정확 문자열로 매칭하는 목록이다. 무접두 'super_admin' 은 역할 카탈로그에
//   정의가 없고 보유자도 0명이라 어떤 행과도 매칭되지 않는 무효항이므로 제거(질의 결과 불변).
//   나머지 무접두 'admin'/'operator' 는 본 WO 범위 밖이라 유지한다.
const PLATFORM_ADMIN_ROLES = ['admin', 'operator'];

/**
 * Verify that the authenticated user's organization has access to the given product.
 *
 * @returns { allowed: true, organizationId } on success
 *          { allowed: false, organizationId: null } on denial
 */
export async function verifyProductOrgAccess(
  dataSource: DataSource,
  productId: string,
  userId: string,
): Promise<{ allowed: boolean; organizationId: string | null }> {
  // 1. Platform admin / operator — bypass org check
  const adminRows = await dataSource.query(
    `SELECT 1 FROM role_assignments
     WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true LIMIT 1`,
    [userId, PLATFORM_ADMIN_ROLES],
  );
  if (adminRows.length > 0) return { allowed: true, organizationId: null };

  // 2. Resolve user's organization
  const orgRows = await dataSource.query(
    `SELECT organization_id FROM organization_members
     WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
    [userId],
  );
  if (orgRows.length === 0) return { allowed: false, organizationId: null };
  const organizationId: string = orgRows[0].organization_id;

  // 3. Check product is listed in user's organization
  //    organization_product_listings → supplier_product_offers (offer_id) → master_id = productId
  const listingRows = await dataSource.query(
    `SELECT 1 FROM organization_product_listings opl
     JOIN supplier_product_offers spo ON spo.id = opl.offer_id
     WHERE spo.master_id = $1
       AND opl.organization_id = $2
     LIMIT 1`,
    [productId, organizationId],
  );
  if (listingRows.length > 0) return { allowed: true, organizationId };

  return { allowed: false, organizationId };
}

/**
 * Resolve the caller's organizationId from organization_members.
 * Used for scoping recommendation popularity aggregation to the caller's org.
 * Returns null if the user has no org (platform admin / ungrouped user).
 */
export async function resolveCallerOrg(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM organization_members
     WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
    [userId],
  );
  return rows.length > 0 ? rows[0].organization_id : null;
}
