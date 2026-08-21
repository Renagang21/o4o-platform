/**
 * Supplier Opt-in Service Keys — SSOT
 *
 * WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1
 *
 * ## 두 개의 공급 축
 *
 * 플랫폼에는 공급자가 자기 Offer 를 특정 서비스에 연결하는 축이 **두 가지** 있다.
 *
 *   1. 운영자 승인 축 — `APPROVAL_ELIGIBLE_SERVICE_KEYS`
 *      (glycopharm · kpa-society · k-cosmetics)
 *      공급자가 신청하면 `offer_service_approvals` 가 생기고, 해당 서비스 운영자가
 *      승인해야 매장에 노출된다.
 *
 *   2. **공급자 직접 opt-in 축 — 이 파일**
 *      공급자가 켜면 그대로 그 서비스의 매장 HUB 에 노출된다. 운영자 승인 게이트가 없다.
 *      노출 조건은 `spo.service_keys` 포함 여부 + 공급자 ACTIVE + 상품 ACTIVE 뿐이다.
 *
 * ## Pharmacy-Hub 가 2번인 이유
 *
 * `docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md` §3:
 * Pharmacy-Hub 운영자는 **공급 승인 capability 를 갖지 않는다**. 공급자는 Neture 에서만
 * 활동하고, Neture 에서 켠 결과가 Pharmacy-Hub 매장 HUB 로 바로 유입된다.
 *
 * ## 이 목록에 서비스를 추가하려면
 *
 * 그 서비스의 운영자가 공급 승인을 하지 않는다는 뜻이다. 서비스 모델 baseline 문서에
 * 먼저 명문화한 뒤 추가한다. 두 목록에 동시에 들어가는 키는 없어야 한다.
 */

import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { isApprovalEligibleServiceKey } from './approval-service-keys.js';

/**
 * 공급자가 운영자 승인 없이 직접 켜고 끄는 서비스 키.
 * 이 키들에 대해서만 `/neture/supplier/services/:serviceKey/*` 경로가 열린다.
 */
export const SUPPLIER_OPTIN_SERVICE_KEYS = [SERVICE_KEYS.PHARMACY_HUB] as const;

export type SupplierOptinServiceKey = (typeof SUPPLIER_OPTIN_SERVICE_KEYS)[number];

const OPTIN_SET: Set<string> = new Set(SUPPLIER_OPTIN_SERVICE_KEYS);

/**
 * 공급자 직접 opt-in 대상 서비스인가.
 *
 * 승인 축과 겹치면 두 계약이 같은 키를 서로 다르게 해석하게 되므로 방어적으로 배제한다
 * (설계상 겹칠 수 없지만, 목록을 늘릴 때 실수하면 조용히 승인 게이트가 우회된다).
 */
export function isSupplierOptinServiceKey(key: string): key is SupplierOptinServiceKey {
  return OPTIN_SET.has(key) && !isApprovalEligibleServiceKey(key);
}

/** 서비스 표기명 — 공급자 화면·에러 메시지용 */
export const SUPPLIER_OPTIN_SERVICE_LABEL: Record<string, string> = {
  [SERVICE_KEYS.PHARMACY_HUB]: 'Pharmacy-Hub',
};
