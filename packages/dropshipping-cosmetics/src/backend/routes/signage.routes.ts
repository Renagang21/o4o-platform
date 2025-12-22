/**
 * Digital Signage Routes for Cosmetics
 *
 * Provides API routes for digital signage displays
 *
 * MVP Phase 1: Store 기반 Sample/Display 연계 콘텐츠 API 추가
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SignageController } from '../controllers/signage.controller.js';
import { CosmeticsFilterService } from '../services/cosmetics-filter.service.js';
import { RoutineReaderService } from '../services/routine-reader.service.js';
import { SignageContentMapperService } from '../services/signage-content-mapper.service.js';

export function createSignageRoutes(dataSource: DataSource): Router {
  const router = Router();
  const filterService = new CosmeticsFilterService(dataSource);
  // Use read-only RoutineReaderService for PartnerRoutine access (Phase 7-Y)
  const routineReader = new RoutineReaderService(dataSource);
  // MVP Phase 1: Content mapper for store-based signage
  const contentMapper = new SignageContentMapperService(dataSource);
  const controller = new SignageController(filterService, routineReader, contentMapper);

  // GET /api/v1/cosmetics/products/signage - Get products for signage
  // Query params: skinType, concerns, category, limit, featured
  router.get('/products/signage', (req, res) =>
    controller.getProductsForSignage(req, res)
  );

  // GET /api/v1/cosmetics/routines/signage - Get routines for signage
  // Query params: skinType, concerns, timeOfUse, limit
  router.get('/routines/signage', (req, res) =>
    controller.getRoutinesForSignage(req, res)
  );

  // GET /api/v1/cosmetics/signage/featured - Get featured content
  // Query params: storeId, displayType
  router.get('/signage/featured', (req, res) =>
    controller.getFeaturedForSignage(req, res)
  );

  // ============================================
  // MVP Phase 1: Store-based Content API
  // ============================================

  // GET /api/v1/cosmetics/signage/store/:storeId/contents
  // Get all signage contents for a specific store
  // Query params: maxItems, includeAlerts, includeSamplePromo, includeDisplayHighlight
  router.get('/signage/store/:storeId/contents', (req, res) =>
    controller.getStoreContents(req, res)
  );

  // GET /api/v1/cosmetics/signage/store/:storeId/alerts
  // Get only operation alerts for a store
  router.get('/signage/store/:storeId/alerts', (req, res) =>
    controller.getStoreAlerts(req, res)
  );

  return router;
}

export default createSignageRoutes;
