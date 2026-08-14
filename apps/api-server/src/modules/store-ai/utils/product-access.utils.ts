/**
 * Global Product Resource Access — WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1
 *
 * product_ai_contents / product_ai_tags 는 organization·store·service 소유가 아닌
 * **ProductMaster 기반 전역(플랫폼 소유) 자원**이다.
 * 따라서 접근 판정 축은 "organization ownership" 이 아니라 **actor 와 master 와의 관계**이다.
 *
 * 확정 정책 (사용자 승인, 2026-07-29):
 *   - 표준 ProductMaster 는 **전 서비스 공용**이며 service 소유권을 갖지 않는다.
 *     → `service_products` / `organization_product_listings.service_key` / role prefix 를
 *       ProductMaster 의 service 경계로 사용하지 않는다.
 *   - `{service}:operator` · `{service}:admin` 은 **역할만으로 전역 쓰기 권한을 얻지 않는다.**
 *     (suffix 든 prefix 든 role 문자열만 보고 허용하는 분기를 만들지 않는다)
 *   - 전역 쓰기가 필요한 운영자는 `platform:super_admin` 을 사용한다.
 *
 * 판정 순서:
 *   1. platform:super_admin         → 전 모드 허용
 *   2. 공급자 + 자기 offer.master_id → 전 모드 허용 (write 는 ACTIVE 공급자만)
 *   3. active OPL(organization_id + master_id) 보유 매장 → 'render_read' 만 허용
 *   4. 그 외                         → 거부
 *
 * WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1:
 *   한 사용자가 공급자 관계와 매장 관계를 동시에 보유할 수 있으므로 두 관계를 **독립적으로**
 *   평가한다. 공급자 관계가 해당 master 와 무관해도 'render_read' 에 한해 매장 관계 판정을
 *   계속한다. 'write' / 'manage_read' 는 공급자 관계 실패 시 즉시 종료한다 (확대 없음).
 *
 * 내부 자동 생성·임포트(스케줄러·시드 스크립트)는 HTTP 계층을 거치지 않고 서비스를 직접
 * 호출하므로 본 가드의 대상이 아니다.
 *
 * 상세: docs/checks/CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1.md
 */

import type { DataSource } from 'typeorm';

/**
 * §8.1 ID 계약 가드.
 *
 * product_ai_contents / product_ai_tags 의 product_id 는 product_masters.id 전용이다.
 * store_local_products.id 나 임의 UUID 가 전역 행으로 조용히 저장되면 고아 행이 생기고,
 * ai-tags 의 경우 syncMasterTags() 를 통해 product_masters.tags 까지 오염된다.
 *
 * 존재하지 않는 master → 404 PRODUCT_MASTER_NOT_FOUND (호출부에서 응답).
 * 접근 판정(403)과는 별개의 축이며, 접근 판정 이후에 평가하여 미인가 호출자에게
 * master 존재 여부를 노출하지 않는다.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function productMasterExists(
  dataSource: DataSource,
  productId: string,
): Promise<boolean> {
  // 잘못된 형식의 UUID 는 쿼리 자체가 실패하므로 사전 차단
  if (!UUID_RE.test(productId ?? '')) {
    return false;
  }
  const rows = await dataSource.query(`SELECT 1 FROM product_masters WHERE id = $1 LIMIT 1`, [
    productId,
  ]);
  return rows.length > 0;
}

/**
 * 전역 상품 자원 접근 모드.
 *
 *   'write'       — 생성·수정·삭제. platform:super_admin | 자기 offer master 보유 ACTIVE 공급자
 *   'manage_read' — AI contents / AI tags **관리 API 조회**. 위 주체 (공급자는 status 무관)
 *                   → 매장은 통과하지 못한다. 전역 자원 관리 화면은 매장의 소비 대상이 아니다.
 *   'render_read' — POP PDF 등 **렌더 소비 조회**. 위 주체 + active OPL 보유 매장
 */
export type ProductAccessMode = 'write' | 'manage_read' | 'render_read';

/** 허용된 호출자의 성격. 거부 시 'none'. */
export type ProductActorType = 'platform_admin' | 'supplier' | 'store' | 'none';

export interface GlobalProductResourceAccess {
  allowed: boolean;
  actorType: ProductActorType;
  accessMode: ProductAccessMode;
  /** 매장 read 로 허용된 경우의 조직. 그 외 null */
  organizationId: string | null;
  /** 공급자로 허용된 경우의 neture_suppliers.id. 그 외 null */
  supplierId: string | null;
  productMasterId: string;
  /**
   * 허용된 경우 **최종적으로 권한을 부여한 관계**.
   * 겸업 사용자(공급자 링크 + 매장 소속)가 매장 관계로 허용된 경우
   * `'ACTIVE_ORGANIZATION_LISTING'` 이며 `actorType` 도 `'store'` 이다.
   * 공급자 링크를 보유했다는 이유로 공급자 축으로 기록하지 않는다.
   */
  grantReason?: 'PLATFORM_SUPER_ADMIN' | 'OWN_SUPPLIER_OFFER' | 'ACTIVE_ORGANIZATION_LISTING';
  /** 거부 사유 코드 (로깅·디버깅용, 응답 본문에 그대로 노출하지 않는다) */
  denyReason?:
    | 'NO_USER'
    | 'INVALID_PRODUCT_ID'
    | 'WRITE_REQUIRES_ACTIVE_SUPPLIER'
    | 'NO_RELATION_TO_MASTER'
    | 'STORE_WRITE_FORBIDDEN';
}

/** 전역 상품 자원에 대한 무제한 권한. RBAC SSOT 상 정확 문자열이며 prefix 매칭하지 않는다. */
const GLOBAL_PRODUCT_ADMIN_ROLES = ['platform:super_admin'];

/**
 * 전역 상품 AI 자원(product_ai_contents / product_ai_tags / POP 렌더)에 대한 접근 판정.
 *
 * @param mode 'write' 는 생성·수정·삭제, 'read' 는 조회.
 */
export async function resolveGlobalProductResourceAccess(
  dataSource: DataSource,
  productId: string,
  userId: string | undefined,
  mode: ProductAccessMode,
): Promise<GlobalProductResourceAccess> {
  const base = {
    accessMode: mode,
    organizationId: null,
    supplierId: null,
    productMasterId: productId,
  } as const;

  if (!userId) {
    return { ...base, allowed: false, actorType: 'none', denyReason: 'NO_USER' };
  }

  // UUID 형식이 아니면 아래 uuid 비교 쿼리가 예외를 던져 500 이 되므로 여기서 거부한다.
  if (!UUID_RE.test(productId ?? '')) {
    return { ...base, allowed: false, actorType: 'none', denyReason: 'INVALID_PRODUCT_ID' };
  }

  // 1. platform:super_admin — 전역 read/write
  const adminRows = await dataSource.query(
    `SELECT 1 FROM role_assignments
     WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true LIMIT 1`,
    [userId, GLOBAL_PRODUCT_ADMIN_ROLES],
  );
  if (adminRows.length > 0) {
    return {
      ...base,
      allowed: true,
      actorType: 'platform_admin',
      grantReason: 'PLATFORM_SUPER_ADMIN',
    };
  }

  // 2. 공급자 — 자기 offer 에 연결된 master 만.
  //    neture-identity.middleware 와 동일한 해석: 링크된 공급자는 read, 쓰기는 ACTIVE 만.
  const supplierRows = await dataSource.query(
    `SELECT id, status FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (supplierRows.length > 0) {
    const supplierId: string = supplierRows[0].id;
    const supplierStatus: string = supplierRows[0].status;
    const ownRows = await dataSource.query(
      `SELECT 1 FROM supplier_product_offers
       WHERE supplier_id = $1 AND master_id = $2 LIMIT 1`,
      [supplierId, productId],
    );
    if (ownRows.length > 0) {
      if (mode === 'write' && supplierStatus !== 'ACTIVE') {
        return {
          ...base,
          allowed: false,
          actorType: 'none',
          supplierId,
          denyReason: 'WRITE_REQUIRES_ACTIVE_SUPPLIER',
        };
      }
      return {
        ...base,
        allowed: true,
        actorType: 'supplier',
        supplierId,
        grantReason: 'OWN_SUPPLIER_OFFER',
      };
    }
    // WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1:
    // 한 사용자가 공급자 관계와 매장 관계를 **동시에** 보유할 수 있다.
    // 공급자 관계 실패를 매장 권한으로 '승격'하는 것이 아니라, 두 관계를 **독립적으로** 평가한다.
    // 단, 확대 범위는 'render_read' 로 한정한다 — write / manage_read 는 여기서 즉시 종료한다.
    if (mode !== 'render_read') {
      return {
        ...base,
        allowed: false,
        actorType: 'none',
        supplierId,
        denyReason: 'NO_RELATION_TO_MASTER',
      };
    }
    // → 아래 매장 관계 판정을 계속한다.
  }

  // 3. 매장 — active OPL 기반 **렌더 조회 전용**.
  //    offer_id → supplier_product_offers 경유는 제거하고 opl.master_id 를 직접 사용한다.
  if (mode !== 'render_read') {
    return {
      ...base,
      allowed: false,
      actorType: 'none',
      denyReason: mode === 'write' ? 'STORE_WRITE_FORBIDDEN' : 'NO_RELATION_TO_MASTER',
    };
  }

  const orgRows = await dataSource.query(
    // WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
    // 허용 집합은 그대로 두고 선택만 결정적으로 만든다 (정렬 없는 LIMIT 1 금지).
    `SELECT organization_id FROM organization_members
     WHERE user_id = $1 AND left_at IS NULL
     ORDER BY is_primary DESC NULLS LAST, joined_at ASC, organization_id ASC
     LIMIT 1`,
    [userId],
  );
  if (orgRows.length === 0) {
    return { ...base, allowed: false, actorType: 'none', denyReason: 'NO_RELATION_TO_MASTER' };
  }
  const organizationId: string = orgRows[0].organization_id;

  const listingRows = await dataSource.query(
    `SELECT 1 FROM organization_product_listings
     WHERE organization_id = $1 AND master_id = $2 AND is_active = true LIMIT 1`,
    [organizationId, productId],
  );
  if (listingRows.length === 0) {
    return {
      ...base,
      allowed: false,
      actorType: 'none',
      organizationId,
      denyReason: 'NO_RELATION_TO_MASTER',
    };
  }

  // 겸업 사용자(공급자 링크 보유)가 여기까지 온 경우에도 **최종 허용 관계는 매장**이므로
  // actorType='store' / grantReason='ACTIVE_ORGANIZATION_LISTING' 로 기록한다 (§7).
  return {
    ...base,
    allowed: true,
    actorType: 'store',
    organizationId,
    grantReason: 'ACTIVE_ORGANIZATION_LISTING',
  };
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
    // WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
    // 허용 집합은 그대로 두고 선택만 결정적으로 만든다 (정렬 없는 LIMIT 1 금지).
    `SELECT organization_id FROM organization_members
     WHERE user_id = $1 AND left_at IS NULL
     ORDER BY is_primary DESC NULLS LAST, joined_at ASC, organization_id ASC
     LIMIT 1`,
    [userId],
  );
  return rows.length > 0 ? rows[0].organization_id : null;
}
