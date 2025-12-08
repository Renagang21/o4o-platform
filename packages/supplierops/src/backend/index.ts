/**
 * SupplierOps Backend
 *
 * Express Router factory for Module Loader integration
 * Note: Full NestJS integration is in controllers/ directory
 */

import { Router } from 'express';

/**
 * Routes factory compatible with Module Loader
 *
 * Creates a combined router for all SupplierOps routes
 * Currently returns placeholder routes; full API integration pending
 *
 * @param dataSource - TypeORM DataSource from API server (optional)
 */
export function routes(dataSource?: any): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'supplierops',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Dashboard API
  router.get('/dashboard', (_req, res) => {
    res.json({
      message: 'SupplierOps Dashboard API',
      approvalStatus: 'active',
      totalProducts: 25,
      activeOffers: 18,
      pendingListingRequests: 5,
      relayStats: { pending: 3, dispatched: 8, fulfilled: 45, failed: 1 },
      monthSales: 8750000,
      pendingSettlement: 3500000,
    });
  });

  // Products API
  router.get('/products', (_req, res) => {
    res.json({
      message: 'SupplierOps Products API',
      products: [],
    });
  });

  // Offers API
  router.get('/offers', (_req, res) => {
    res.json({
      message: 'SupplierOps Offers API',
      offers: [],
    });
  });

  // Orders API
  router.get('/orders', (_req, res) => {
    res.json({
      message: 'SupplierOps Orders API',
      orders: [],
    });
  });

  // Settlement API
  router.get('/settlement', (_req, res) => {
    res.json({
      message: 'SupplierOps Settlement API',
      batches: [],
    });
  });

  // Profile API
  router.get('/profile', (_req, res) => {
    res.json({
      message: 'SupplierOps Profile API',
    });
  });

  return router;
}

/**
 * Services export for Module Loader
 */
export * from '../services/index.js';

/**
 * Controllers export (NestJS format)
 */
export * from '../controllers/index.js';

/**
 * Entity list (empty - SupplierOps uses dropshipping-core entities)
 */
export const entities: any[] = [];
