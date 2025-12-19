export * from './products';
export * from './cart';
export * from './orders';
export * from './categories';
export * from './reviews';
export * from './suppliers';
export * from './groupbuy';
export * from './checkout';
export * from './member';
// admin-orders exports - excluding ShippingAddress (duplicate with checkout)
export {
  getAdminOrders,
  getAdminOrder,
  refundOrder,
  getOrderLogs,
  getOrderStats,
  type AdminOrder,
  type AdminPayment,
  type OrderLog,
  type OrderStats,
  type OrderListFilters,
  type OrderListResponse,
  type OrderItem,
} from './admin-orders';

// Re-export as a single API object for convenience
import { productsApi } from './products';
import { cartApi } from './cart';
import { ordersApi } from './orders';
import { categoriesApi } from './categories';
import { reviewsApi } from './reviews';
import { suppliersApi } from './suppliers';
import { groupbuyApi } from './groupbuy';
import { memberApi } from './member';

export const api = {
  products: productsApi,
  cart: cartApi,
  orders: ordersApi,
  categories: categoriesApi,
  reviews: reviewsApi,
  suppliers: suppliersApi,
  groupbuy: groupbuyApi,
  member: memberApi,
};
