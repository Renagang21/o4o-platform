/** Existing order_id uniqueness forbids connecting one order to multiple settlements. */
export class SettlementOrderConflictError extends Error {
  readonly code = 'SETTLEMENT_ORDER_SUPPLIER_CONFLICT';

  constructor(readonly conflictingOrderCount: number) {
    super('정산 대상 주문이 여러 공급자에 중복 연결되어 있습니다. 주문의 공급자 연결을 확인해 주세요.');
    this.name = 'SettlementOrderConflictError';
  }
}
