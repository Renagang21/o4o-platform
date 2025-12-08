/**
 * SellerOps Backend
 *
 * Express Router factory for Module Loader integration
 * Note: Full NestJS integration is in controllers/ directory
 */

import { Router } from 'express';

/**
 * Routes factory compatible with Module Loader
 *
 * Creates a combined router for all SellerOps routes
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
      app: 'sellerops',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Placeholder routes - to be integrated with NestJS controllers
  router.get('/dashboard', (_req, res) => {
    res.json({
      message: 'SellerOps Dashboard API - Use NestJS integration',
      todayOrders: 12,
      monthSales: 4560000,
      activeListings: 45,
      pendingSettlement: 2340000,
    });
  });

  router.get('/profile', (_req, res) => {
    res.json({
      message: 'SellerOps Profile API - Use NestJS integration',
    });
  });

  router.get('/suppliers', (_req, res) => {
    res.json({
      message: 'SellerOps Suppliers API - Use NestJS integration',
      suppliers: [],
    });
  });

  router.get('/listings', (_req, res) => {
    res.json({
      message: 'SellerOps Listings API - Use NestJS integration',
      listings: [],
    });
  });

  router.get('/orders', (_req, res) => {
    res.json({
      message: 'SellerOps Orders API - Use NestJS integration',
      orders: [],
    });
  });

  router.get('/settlement', (_req, res) => {
    res.json({
      message: 'SellerOps Settlement API - Use NestJS integration',
      batches: [],
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
 * Entity list (empty - SellerOps uses dropshipping-core entities)
 */
export const entities: any[] = [];
