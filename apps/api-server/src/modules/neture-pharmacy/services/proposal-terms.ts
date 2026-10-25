import { NeturePharmacyError } from '../constants.js';

export interface ProposalTerms {
  version: 1;
  baseShippingFee: number;
  freeShippingThreshold: number | null;
  minOrderAmount: number;
}

const money = (value: unknown, positive = false): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= (positive ? 1 : 0) && value <= 2147483647;

/** Conditions are frozen at request creation, never read from supplier settings again. */
export function proposalTerms(input: unknown, fallback: { baseShippingFee?: number | null; freeShippingThreshold?: number | null }): ProposalTerms {
  if (input === undefined) {
    return { version: 1, baseShippingFee: fallback.freeShippingThreshold === 0 ? 0 : (fallback.baseShippingFee ?? 0), freeShippingThreshold: fallback.freeShippingThreshold === 0 ? null : (fallback.freeShippingThreshold ?? null), minOrderAmount: 0 };
  }
  const terms = input as Partial<ProposalTerms> | null;
  if (!terms || typeof terms !== 'object' || Array.isArray(terms) || !money(terms.baseShippingFee) ||
      !(terms.freeShippingThreshold === null || money(terms.freeShippingThreshold, true)) || !money(terms.minOrderAmount)) {
    throw new NeturePharmacyError(400, 'INVALID_PROPOSAL_TERMS', '배송비·최소 주문금액은 0 이상 정수, 무료배송 기준은 양의 정수 또는 미설정이어야 합니다.');
  }
  return { version: 1, baseShippingFee: terms.baseShippingFee, freeShippingThreshold: terms.freeShippingThreshold!, minOrderAmount: terms.minOrderAmount };
}
