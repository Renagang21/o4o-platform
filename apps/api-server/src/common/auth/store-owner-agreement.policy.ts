/**
 * Store Owner Agreement Policy — 매장 경영자 이용계약 acceptance 공통 계약
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §2 · §3
 *
 * terms acceptance 와 별개 축이다.
 * - terms: 모든 서비스 회원 공통
 * - store_owner_agreement: 실제 store_owner 역할 + active membership 보유자만 Store Workspace에서 요구
 *
 * 문서가 published 되기 전에는 요구하지 않는다.
 */

export const STORE_OWNER_AGREEMENT_DOCUMENT_TYPE = 'store_owner_agreement';
export const STORE_OWNER_AGREEMENT_REQUIRED_CODE = 'STORE_OWNER_AGREEMENT_REQUIRED';
export const STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE =
  '매장 경영자 이용계약에 동의한 뒤 매장 업무공간을 이용할 수 있습니다.';
export const STORE_OWNER_AGREEMENT_REQUIRED_STATUS = 428;

export const STORE_OWNER_ROLE_BY_SERVICE: Readonly<Record<string, string>> = {
  'kpa-society': 'kpa:store_owner',
  'k-cosmetics': 'cosmetics:store_owner',
  'pharmacy-hub': 'pharmacy-hub:store_owner',
};

export const STORE_OWNER_AGREEMENT_SERVICE_KEYS = Object.freeze(
  Object.keys(STORE_OWNER_ROLE_BY_SERVICE),
);

export function isStoreOwnerAgreementServiceKey(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(STORE_OWNER_ROLE_BY_SERVICE, value);
}
