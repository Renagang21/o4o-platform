import type { SupplyOption } from './services/supply-access.js';
import type { PharmacyCartService } from './services/pharmacy-cart.service.js';

/** One explicit allowlist defines both the HTTP type and its runtime projection. */
const OPTION_FIELDS = [
  'kind', 'optionId', 'productName', 'supplierName', 'semiFranchiseKey', 'semiFranchiseName',
  'unitPrice', 'targetOrganizationId', 'note', 'startAt', 'endAt', 'totalQuantity',
  'perStoreLimit', 'perOrderLimit', 'termsSnapshot',
] as const satisfies readonly (keyof SupplyOption)[];
const TERMS_FIELDS = ['version', 'baseShippingFee', 'freeShippingThreshold', 'minOrderAmount'] as const;
export type SupplyOptionResponse = Pick<SupplyOption, typeof OPTION_FIELDS[number]>;

function selectFields<T, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map(key => [key, value[key]])) as Pick<T, K>;
}

/** HTTP only: order, inventory and settlement keep the full internal SupplyOption. */
export function toSupplyOptionResponse(option: SupplyOption): SupplyOptionResponse {
  return {
    ...selectFields(option, OPTION_FIELDS),
    termsSnapshot: option.termsSnapshot == null ? option.termsSnapshot : selectFields(option.termsSnapshot, TERMS_FIELDS),
  };
}

export function toCartItemResponse(item: Awaited<ReturnType<PharmacyCartService['list']>>[number]) {
  return {
    id: item.id,
    kind: item.kind,
    optionId: item.optionId,
    productName: item.productName,
    quantity: item.quantity,
    available: item.available,
    unitPrice: item.unitPrice,
    option: item.option === null ? null : toSupplyOptionResponse(item.option),
  };
}
