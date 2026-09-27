/**
 * 공급자 **서브도메인 전체 운영자** 경계 — `supplier.neture.co.kr`
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이것은 **공급자 사업자 본인의 접근 경계가 아니다.** 두 축을 혼동하면 안 된다.
 *
 *   사업자 본인   organization_members(role=owner) → organizations(type='supplier')
 *                 → neture_suppliers.organization_id
 *                 = canonical authorization · FROZEN (O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 §7)
 *                 이 WO 는 그 관계를 건드리지 않았다. 판정은 neture-identity.middleware 가 한다.
 *
 *   운영자        role_assignments('supplier:admin' | 'supplier:operator')
 *                 = 공급자 심사·정지·서류 확인처럼 **그 영역을 운영하는 쪽**의 권한
 *
 * 착수 중에는 "라우터가 /api/v1/neture/supplier/** 이고 인가는 organization_members 이므로
 * 기존 neture 키로 충분하다" 고 판정했다가 **철회했다.** 조직 소유권 검사가 있다는 사실은
 * 서브도메인 전체 운영자 권한을 구분하지 않아도 된다는 뜻이 아니다 — 두 질문이 다르다.
 * 종전에는 `neture:admin` 하나가 공급자 심사까지 열었다.
 */
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const SUPPLIER_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'supplier',
  allowedRoles: ['supplier:admin', 'supplier:operator'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture', 'community'],
  // mapping 이 비면 allowedRoles 전체로 fallback 하므로 명시한다.
  scopeRoleMapping: {
    'supplier:admin': ['supplier:admin'],
    'supplier:operator': ['supplier:operator', 'supplier:admin'],
  },
};

export const requireSupplierScope = createMembershipScopeGuard(SUPPLIER_SCOPE_CONFIG);
