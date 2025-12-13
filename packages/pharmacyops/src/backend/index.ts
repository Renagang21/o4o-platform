/**
 * PharmacyOps Backend
 *
 * NestJS 모듈 통합
 *
 * @package @o4o/pharmacyops
 */

import type { Router } from 'express';
import { pharmacyOpsServices } from '../services/index.js';
import { pharmacyOpsControllers } from '../controllers/index.js';

// Re-export services
export * from '../services/index.js';

// Re-export controllers
export * from '../controllers/index.js';

/**
 * Create Express routes for PharmacyOps
 * Used by ModuleLoader
 */
export function createRoutes(): Router {
  // TODO: Implement Express router creation
  // This is a placeholder - actual implementation will use NestJS module
  throw new Error('Use NestJS module instead');
}

/**
 * PharmacyOps NestJS module configuration
 */
export const pharmacyOpsModuleConfig = {
  controllers: pharmacyOpsControllers,
  providers: pharmacyOpsServices,
  exports: pharmacyOpsServices,
};

/**
 * Route prefix for PharmacyOps API
 */
export const PHARMACYOPS_ROUTE_PREFIX = 'api/v1/pharmacyops';

/**
 * API route definitions
 */
export const pharmacyOpsRoutes = {
  dashboard: {
    base: '/dashboard',
    statistics: '/dashboard/statistics',
    trend: '/dashboard/trend',
  },
  products: {
    base: '/products',
    detail: '/products/:id',
    searchDrugCode: '/products/search/drug-code/:code',
    searchPermit: '/products/search/permit/:number',
    searchIngredient: '/products/search/ingredient',
    category: '/products/category/:category',
  },
  offers: {
    base: '/offers',
    detail: '/offers/:id',
    byProduct: '/offers/product/:productId',
    lowestPrice: '/offers/product/:productId/lowest',
    fastDelivery: '/offers/product/:productId/fast-delivery',
    coldChain: '/offers/product/:productId/cold-chain',
    compare: '/offers/product/:productId/compare',
  },
  orders: {
    base: '/orders',
    recent: '/orders/recent',
    active: '/orders/active',
    unpaid: '/orders/unpaid',
    detail: '/orders/:id',
    validate: '/orders/validate',
    cancel: '/orders/:id/cancel',
    byNumber: '/orders/number/:orderNumber',
    reorder: '/orders/:id/reorder',
  },
  dispatch: {
    base: '/dispatch',
    active: '/dispatch/active',
    today: '/dispatch/today',
    coldChain: '/dispatch/cold-chain',
    narcotics: '/dispatch/narcotics',
    failed: '/dispatch/failed',
    detail: '/dispatch/:id',
    byOrder: '/dispatch/order/:orderId',
    byTracking: '/dispatch/tracking/:trackingNumber',
    temperatureLogs: '/dispatch/:id/temperature-logs',
    confirm: '/dispatch/:id/confirm',
  },
  settlement: {
    base: '/settlement',
    summary: '/settlement/summary',
    pending: '/settlement/pending',
    dueSoon: '/settlement/due-soon',
    monthly: '/settlement/monthly',
    supplierStats: '/settlement/supplier-stats',
    detail: '/settlement/:id',
    bySupplier: '/settlement/supplier/:supplierId',
    pdf: '/settlement/:id/pdf',
    exportExcel: '/settlement/export/excel',
  },
};
