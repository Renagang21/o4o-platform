/**
 * Store owner business information gate
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §4
 *
 * store_owner 활성화 전에 반드시 확인할 최소 사업자정보.
 * 회원계정 생성과는 분리하고, 승인 트랜잭션이 role/membership 을 활성화하기 전에 재검증한다.
 */

export const STORE_OWNER_REQUIRED_BUSINESS_FIELDS = [
  'businessName',
  'representativeName',
  'businessNumber',
  'businessAddress',
  'businessPhone',
] as const;

export type StoreOwnerRequiredBusinessField =
  (typeof STORE_OWNER_REQUIRED_BUSINESS_FIELDS)[number];

export function missingStoreOwnerBusinessFields(
  businessInfo: Record<string, unknown> | null | undefined,
): StoreOwnerRequiredBusinessField[] {
  const info = businessInfo ?? {};
  return STORE_OWNER_REQUIRED_BUSINESS_FIELDS.filter(
    (key) => String(info[key] ?? '').trim().length === 0,
  );
}

export class StoreOwnerBusinessInfoRequiredError extends Error {
  readonly code = 'STORE_OWNER_BUSINESS_INFO_REQUIRED';
  readonly httpStatus = 409;
  constructor(readonly missingFields: StoreOwnerRequiredBusinessField[]) {
    super('매장 경영자 승인에 필요한 사업자정보가 누락되었습니다.');
    this.name = 'StoreOwnerBusinessInfoRequiredError';
  }
}

export function requiresStoreOwnerBusinessGate(serviceKey: string, role: string): boolean {
  return (
    (serviceKey === 'k-cosmetics' && role === 'cosmetics:store_owner') ||
    (serviceKey === 'pharmacy-hub' && role === 'pharmacy-hub:store_owner')
  );
}
