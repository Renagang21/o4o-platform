/**
 * E-commerce Core Services
 */

export {
  EcommerceOrderService,
  type CreateOrderDto,
  type CreateOrderItemDto,
} from './EcommerceOrderService.js';

export {
  EcommercePaymentService,
  type CreatePaymentDto,
  type CompletePaymentDto,
  type RefundPaymentDto,
} from './EcommercePaymentService.js';

export {
  EcommerceOrderQueryService,
  type DailyOrderSummary,
  type OrderTypeStats,
  type SellerStats,
  type OrderQueryFilters,
} from './EcommerceOrderQueryService.js';

// Cosmetics 도메인 전용 (H2-0)
export {
  CosmeticsOrderService,
  type OrderChannel,
  type FulfillmentType,
  type TaxRefundMeta,
  type TravelChannelMeta,
  type LocalChannelMeta,
  type CommissionMeta,
  type CosmeticsOrderMetadata,
  type ProductSnapshot,
  type CreateCosmeticsOrderItemDto,
  type CreateCosmeticsOrderDto,
} from './CosmeticsOrderService.js';
