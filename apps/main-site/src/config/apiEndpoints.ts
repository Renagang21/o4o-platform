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

  // Partner Links (Phase 6-2)
  PARTNER_LINKS: {
    LIST: '/partner/links',
    DETAIL: (id: string) => `/partner/links/${id}`,
    CREATE: '/partner/links',
    UPDATE: (id: string) => `/partner/links/${id}`,
    DELETE: (id: string) => `/partner/links/${id}`,
  },

  // Partner Analytics (Phase 6-2)
  PARTNER_ANALYTICS: {
    SUMMARY: '/partner/analytics/summary',
    TIMESERIES: '/partner/analytics/timeseries',
    LINKS: '/partner/analytics/links',
  },

  // Partner Settlements (Phase 6-2)
  PARTNER_SETTLEMENTS: {
    LIST: '/partner/settlements',
    DETAIL: (id: string) => `/partner/settlements/${id}`,
    CREATE: '/partner/settlements',
    UPDATE_STATUS: (id: string) => `/partner/settlements/${id}/status`,
    UPDATE_PAYOUT_INFO: (id: string) => `/partner/settlements/${id}/payout-info`,
    UPDATE_MEMO: (id: string) => `/partner/settlements/${id}/internal-note`,
  },

  // Supplier Settlements (Phase 6-2)
  SUPPLIER_SETTLEMENTS: {
    LIST: '/supplier/settlements',
    DETAIL: (id: string) => `/supplier/settlements/${id}`,
    CREATE: '/supplier/settlements',
    UPDATE_STATUS: (id: string) => `/supplier/settlements/${id}/status`,
    UPDATE_MEMO: (id: string) => `/supplier/settlements/${id}/internal-note`,
  },

  // Seller Settlements (Phase 6-2)
  SELLER_SETTLEMENTS: {
    LIST: '/seller/settlements',
    DETAIL: (id: string) => `/seller/settlements/${id}`,
    CREATE: '/seller/settlements',
    UPDATE_STATUS: (id: string) => `/seller/settlements/${id}/status`,
    UPDATE_MEMO: (id: string) => `/seller/settlements/${id}/internal-note`,
  },

  // Admin Settlements (Phase 6-2)
  ADMIN_SETTLEMENTS: {
    LIST: '/admin/settlements',
    DETAIL: (id: string) => `/admin/settlements/${id}`,
    CREATE: '/admin/settlements',
    UPDATE_STATUS: (id: string) => `/admin/settlements/${id}/status`,
    UPDATE_PAYOUT_INFO: (id: string) => `/admin/settlements/${id}/payout-info`,
    UPDATE_MEMO: (id: string) => `/admin/settlements/${id}/internal-note`,
  },
} as const;

// Type helpers for endpoint parameters
export type EndpointParam = string | number;
