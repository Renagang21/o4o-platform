/**
 * Dashboard Assets Routes
 *
 * WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1: Structure decomposition
 * Original 1,010-line file split into:
 *   - dashboard-assets.types.ts           — Type definitions & utility functions
 *   - dashboard-assets.query-handlers.ts  — GET handlers (list, copied-source-ids, kpi, signals)
 *   - dashboard-assets.mutation-handlers.ts — Mutation handlers (edit, publish, archive, delete)
 *   - dashboard-assets.copy-handlers.ts   — Copy operation + 3 source-type copy functions
 *
 * This file: Route registration only.
 *
 * 핵심 원칙:
 * - Hub = Read Only
 * - My Dashboard = Write / Edit / Delete
 * - 원본 데이터는 절대 수정되지 않음
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';

// Query handlers
import {
  createListAssetsHandler,
  createGetCopiedSourceIdsHandler,
  createGetKpiHandler,
  createGetSupplierSignalHandler,
  createGetSellerSignalHandler,
} from './dashboard-assets.query-handlers.js';

// Mutation handlers
import {
  createUpdateAssetHandler,
  createPublishAssetHandler,
  createArchiveAssetHandler,
  createDeleteAssetHandler,
} from './dashboard-assets.mutation-handlers.js';

// Copy handlers
import { createCopyAssetHandler } from './dashboard-assets.copy-handlers.js';

/**
 * Create Dashboard Assets routes
 */
export function createDashboardAssetsRoutes(dataSource: DataSource): Router {
  const router = Router();

  // === Copy ===
  router.post('/copy', authenticate, createCopyAssetHandler(dataSource));

  // === Queries ===
  router.get('/', authenticate, createListAssetsHandler(dataSource));
  router.get('/copied-source-ids', authenticate, createGetCopiedSourceIdsHandler(dataSource));
  router.get('/kpi', authenticate, createGetKpiHandler(dataSource));
  router.get('/supplier-signal', authenticate, createGetSupplierSignalHandler(dataSource));
  router.get('/seller-signal', authenticate, createGetSellerSignalHandler(dataSource));

  // === Mutations ===
  router.patch('/:id', authenticate, createUpdateAssetHandler(dataSource));
  router.post('/:id/publish', authenticate, createPublishAssetHandler(dataSource));
  router.post('/:id/archive', authenticate, createArchiveAssetHandler(dataSource));
  router.delete('/:id', authenticate, createDeleteAssetHandler(dataSource));

  return router;
}
