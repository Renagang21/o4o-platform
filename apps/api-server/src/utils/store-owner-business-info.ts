/**
 * Store-owner 사업자정보 최소 계약.
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §4
 */
export const STORE_OWNER_REQUIRED_BUSINESS_FIELDS = [
  'businessName',
  'representativeName',
  'businessNumber',
  'businessAddress',
  'businessPhone',
] as const;

export type StoreOwnerRequiredBusinessField = typeof STORE_OWNER_REQUIRED_BUSINESS_FIELDS[number];

const value = (v: unknown) => String(v ?? '').trim();

export function getMissingStoreOwnerBusinessFields(
  businessInfo: Record<string, unknown> | null | undefined,
): StoreOwnerRequiredBusinessField[] {
  const info = businessInfo ?? {};
  return STORE_OWNER_REQUIRED_BUSINESS_FIELDS.filter((field) => value(info[field]) === '');
}

export function getMissingStoreOwnerBusinessInput(
  input: Record<string, any>,
): StoreOwnerRequiredBusinessField[] {
  const normalized: Record<StoreOwnerRequiredBusinessField, unknown> = {
    businessName: input.businessName || input.companyName,
    representativeName: input.representativeName || input.ceoName,
    businessNumber: input.businessNumber,
    businessAddress: input.businessAddress || input.address1,
    businessPhone: input.businessPhone,
  };
  return getMissingStoreOwnerBusinessFields(normalized);
}
