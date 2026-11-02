import type { SupplyOption } from './services/supply-access.js';
import type { PharmacyCartService } from './services/pharmacy-cart.service.js';

/** HTTP 전용 계약. 주문·재고·정산은 서비스의 전체 SupplyOption을 계속 사용한다. */
export type SupplyOptionResponse = Pick<SupplyOption,
  'kind' | 'optionId' | 'productName' | 'supplierName' |
  'semiFranchiseKey' | 'semiFranchiseName' | 'unitPrice' |
  'targetOrganizationId' | 'note' | 'startAt' | 'endAt' |
  'totalQuantity' | 'perStoreLimit' | 'perOrderLimit' | 'termsSnapshot'
>;

export function toSupplyOptionResponse(option: SupplyOption): SupplyOptionResponse {
  return {
    kind: option.kind,
    optionId: option.optionId,
    productName: option.productName,
    supplierName: option.supplierName,
    semiFranchiseKey: option.semiFranchiseKey,
    semiFranchiseName: option.semiFranchiseName,
    unitPrice: option.unitPrice,
    targetOrganizationId: option.targetOrganizationId,
    note: option.note,
    startAt: option.startAt,
    endAt: option.endAt,
    totalQuantity: option.totalQuantity,
    perStoreLimit: option.perStoreLimit,
    perOrderLimit: option.perOrderLimit,
    termsSnapshot: option.termsSnapshot == null ? option.termsSnapshot : {
      version: option.termsSnapshot.version,
      baseShippingFee: option.termsSnapshot.baseShippingFee,
      freeShippingThreshold: option.termsSnapshot.freeShippingThreshold,
      minOrderAmount: option.termsSnapshot.minOrderAmount,
    },
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
