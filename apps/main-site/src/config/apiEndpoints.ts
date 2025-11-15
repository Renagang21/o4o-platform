/**
 * API Endpoints Configuration
 * Phase 6-1: Centralized API endpoint definitions
 *
 * All API endpoints are defined here for easy maintenance and modification.
 * Endpoints are relative to the baseURL configured in authClient (/api/v1)
 */

export const API_ENDPOINTS = {
  // Dropshipping - Supplier Products
  SUPPLIER_PRODUCTS: {
    LIST: '/dropshipping/supplier/products',
    DETAIL: (id: string) => `/dropshipping/supplier/products/${id}`,
    CREATE: '/dropshipping/supplier/products',
    UPDATE: (id: string) => `/dropshipping/supplier/products/${id}`,
    DELETE: (id: string) => `/dropshipping/supplier/products/${id}`,
  },

  // Dropshipping - Supplier Orders
  SUPPLIER_ORDERS: {
    LIST: '/dropshipping/supplier/orders',
    DETAIL: (id: string) => `/dropshipping/supplier/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/dropshipping/supplier/orders/${id}/status`,
    SYNC_STATUS: '/dropshipping/supplier/orders/sync-status',
    CREATE_FROM_CUSTOMER: '/dropshipping/supplier/orders/from-customer',
  },

  // Dropshipping - Seller Products
  SELLER_PRODUCTS: {
    LIST: '/dropshipping/seller/products',
    DETAIL: (id: string) => `/dropshipping/seller/products/${id}`,
    CREATE: '/dropshipping/seller/products',
    UPDATE: (id: string) => `/dropshipping/seller/products/${id}`,
    DELETE: (id: string) => `/dropshipping/seller/products/${id}`,
    SUPPLIER_PRODUCTS_FOR_SELECTION: '/dropshipping/seller/supplier-products-for-selection',
  },

  // Dropshipping - Seller Orders
  SELLER_ORDERS: {
    LIST: '/dropshipping/seller/orders',
    DETAIL: (id: string) => `/dropshipping/seller/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/dropshipping/seller/orders/${id}/status`,
    UPDATE_MEMO: (id: string) => `/dropshipping/seller/orders/${id}/memo`,
    SYNC_STATUS: '/dropshipping/seller/orders/sync-status',
    CREATE_FROM_CUSTOMER: '/dropshipping/seller/orders/from-customer',
  },

  // Storefront - Customer-facing
  STOREFRONT: {
    PRODUCTS: '/storefront/products',
    PRODUCT_DETAIL: (id: string) => `/storefront/products/${id}`,
    ORDERS: '/storefront/orders',
    ORDER_DETAIL: (id: string) => `/storefront/orders/${id}`,
  },

  // Partner (for Phase 6-2)
  PARTNER: {
    LINKS: '/dropshipping/partner/links',
    LINK_DETAIL: (id: string) => `/dropshipping/partner/links/${id}`,
    ANALYTICS: '/dropshipping/partner/analytics',
    SETTLEMENTS: '/dropshipping/partner/settlements',
  },

  // Settlements (for Phase 6-2)
  SETTLEMENTS: {
    PARTNER: '/settlements/partner',
    SUPPLIER: '/settlements/supplier',
    SELLER: '/settlements/seller',
    ADMIN: '/settlements/admin',
  },
} as const;

// Type helpers for endpoint parameters
export type EndpointParam = string | number;
