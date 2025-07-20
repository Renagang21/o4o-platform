export * from './products';
export * from './cart';
export * from './orders';
export * from './categories';
export * from './reviews';
export * from './suppliers';

// Re-export as a single API object for convenience
import { productsApi } from './products';
import { cartApi } from './cart';
import { ordersApi } from './orders';
import { categoriesApi } from './categories';
import { reviewsApi } from './reviews';
import { suppliersApi } from './suppliers';

export const api = {
  products: productsApi,
  cart: cartApi,
  orders: ordersApi,
  categories: categoriesApi,
  reviews: reviewsApi,
  suppliers: suppliersApi
};