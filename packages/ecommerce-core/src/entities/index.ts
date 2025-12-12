/**
 * E-commerce Core Entities
 */

export {
  EcommerceOrder,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
  type ShippingAddress,
} from './EcommerceOrder.entity.js';

export {
  EcommerceOrderItem,
  OrderItemStatus,
} from './EcommerceOrderItem.entity.js';

export {
  EcommercePayment,
  PaymentTransactionStatus,
  PaymentMethod,
} from './EcommercePayment.entity.js';

// Entity 배열 (ModuleLoader용)
export const entities = [
  'EcommerceOrder',
  'EcommerceOrderItem',
  'EcommercePayment',
];
