/**
 * Store Owner Agreement policy — 매장 경영자 별도 계약 acceptance 상수/매핑.
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §2·§3
 * 통합 이용약관(terms)과 별도 축이며 Store Workspace 에만 적용한다.
 */
export const STORE_OWNER_AGREEMENT_DOCUMENT_TYPE = 'store_owner_agreement' as const;
export const STORE_OWNER_AGREEMENT_REQUIRED_CODE = 'STORE_OWNER_AGREEMENT_REQUIRED';
export const STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE = '매장 경영자 이용계약에 동의한 뒤 이용할 수 있습니다.';
export const STORE_OWNER_AGREEMENT_REQUIRED_STATUS = 428;

export const STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE = {
  'kpa-society': 'kpa:store_owner',
  'k-cosmetics': 'cosmetics:store_owner',
  'pharmacy-hub': 'pharmacy-hub:store_owner',
} as const;

export type StoreOwnerAgreementServiceKey = keyof typeof STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE;

export function isStoreOwnerAgreementServiceKey(value: string): value is StoreOwnerAgreementServiceKey {
  return Object.prototype.hasOwnProperty.call(STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE, value);
}

export function canonicalStoreOwnerAgreementServiceKey(value: string): StoreOwnerAgreementServiceKey | null {
  if (isStoreOwnerAgreementServiceKey(value)) return value;
  if (value === 'kpa') return 'kpa-society';
  if (value === 'cosmetics') return 'k-cosmetics';
  return null;
}
