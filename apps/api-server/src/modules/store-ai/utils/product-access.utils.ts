/**
 * Product AI Access Utilities — WO-O4O-STORE-AI-PRODUCT-ORG-GUARD-V1
 *
 * Organization ownership verification for product AI endpoints.
 *
 * 현재 구현 (as-is):
 *   1. role_assignments 에 무접두 'admin'/'operator' 정확 일치 → 우회
 *   2. organization_members 로 org 해석 후 organization_product_listings JOIN 확인
 *   3. 그 외 → 403
 *
 * ⚠ WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 — 위 정책은 실제 계약과 미정렬이다.
 *   - product_ai_contents / product_ai_tags 는 organization 소유가 아닌 **전역 자원**이므로
 *     "org ownership" 자체가 올바른 판정 축이 아니다.
 *   - 무접두 'admin'/'operator' 는 RBAC SSOT 상 활성 보유자 0명 (실 역할은 '{service}:operator' 등 접두형).
 *   - 아래 OPL → supplier_product_offers JOIN 은 실데이터 0행이라 어떤 사용자도 통과하지 못한다 (dead JOIN).
 *   → 결과적으로 모든 주체가 403. 재설계에는 ProductMaster 의 service scope 판정이 선행되어야 하는데
 *     현재 product_masters 에는 service/tenant 축이 존재하지 않아 중지 상태다.
 *     상세: docs/checks/CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1.md
 */

import type { DataSource } from 'typeorm';

/**
 * WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 §8.1 — ID 계약 가드.
 *
 * product_ai_contents / product_ai_tags 의 product_id 는 product_masters.id 전용이다.
 * store_local_products.id 나 임의 UUID 가 전역 행으로 조용히 저장되면 고아 행이 생기고,
 * ai-tags 의 경우 syncMasterTags() 를 통해 product_masters.tags 까지 오염된다.
 *
 * 존재하지 않는 master → 404 PRODUCT_MASTER_NOT_FOUND (호출부에서 응답).
 * 접근 판정(403)과는 별개의 축이며, 접근 판정 이후에 평가하여 미인가 호출자에게
 * master 존재 여부를 노출하지 않는다.
 */
export async function productMasterExists(
  dataSource: DataSource,
  productId: string,
): Promise<boolean> {
  // 잘못된 형식의 UUID 는 쿼리 자체가 실패하므로 사전 차단
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId ?? '')) {
    return false;
  }
  const rows = await dataSource.query(`SELECT 1 FROM product_masters WHERE id = $1 LIMIT 1`, [
    productId,
  ]);
  return rows.length > 0;
}

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
