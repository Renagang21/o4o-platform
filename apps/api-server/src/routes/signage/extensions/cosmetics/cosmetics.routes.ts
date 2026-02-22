/**
 * Cosmetics Extension - Routes
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * API Routes for Cosmetics Extension
 * Base path: /api/signage/:serviceKey/ext/cosmetics
 *
 * Route Groups:
 * - /brands/* : Brand management endpoints - require operator role
 * - /presets/* : Content preset endpoints - require operator role
 * - /contents/* : Brand content endpoints - require operator role
 * - /trends/* : Trend card endpoints - require operator role
 * - /global/* : Store endpoints - require store read role
 * - /stats : Statistics endpoint - require operator role
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CosmeticsController } from './controllers/cosmetics.controller.js';
import {
  createExtensionRouter,
  createExtensionGuards,
} from '../common/index.js';

/**
 * Create Cosmetics Extension Router
 */
export function createCosmeticsRouter(dataSource: DataSource): Router {
  // Create base router with extension middleware
  const router = createExtensionRouter({
    extensionType: 'cosmetics',
    dataSource,
  });

  const controller = new CosmeticsController(dataSource);
  const guards = createExtensionGuards('cosmetics');

  // ========================================================================
  // BRAND ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /brands
   * List all brands
   */
  router.get('/brands', guards.operator, controller.getBrands);

  /**
   * GET /brands/:id
   * Get brand by ID
   */
  router.get('/brands/:id', guards.operator, controller.getBrand);

  /**
   * POST /brands
   * Create new brand
   */
  router.post('/brands', guards.operator, controller.createBrand);

  /**
   * PATCH /brands/:id
   * Update brand
   */
  router.patch('/brands/:id', guards.operator, controller.updateBrand);

  /**
   * DELETE /brands/:id
   * Delete brand
   */
  router.delete('/brands/:id', guards.operator, controller.deleteBrand);

  // ========================================================================
  // CONTENT PRESET ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /presets
   * List all content presets
   */
  router.get('/presets', guards.operator, controller.getContentPresets);

  /**
   * GET /presets/:id
   * Get preset by ID
   */
  router.get('/presets/:id', guards.operator, controller.getContentPreset);

  /**
   * POST /presets
   * Create new preset
   */
  router.post('/presets', guards.operator, controller.createContentPreset);

  /**
   * PATCH /presets/:id
   * Update preset
   */
  router.patch('/presets/:id', guards.operator, controller.updateContentPreset);

  // ========================================================================
  // BRAND CONTENT ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /contents
   * List all brand contents (operator view)
   */
  router.get('/contents', guards.operator, controller.getBrandContents);

  /**
   * GET /contents/:id
   * Get content by ID (operator view)
   */
  router.get('/contents/:id', guards.operator, controller.getBrandContent);

  /**
   * POST /contents
   * Create new brand content
   */
  router.post('/contents', guards.operator, controller.createBrandContent);

  /**
   * PATCH /contents/:id
   * Update brand content
   */
  router.patch('/contents/:id', guards.operator, controller.updateBrandContent);

  /**
   * DELETE /contents/:id
   * Delete brand content (soft delete)
   */
  router.delete('/contents/:id', guards.operator, controller.deleteBrandContent);

  // ========================================================================
  // TREND CARD ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /trends
   * List all trend cards
   */
  router.get('/trends', guards.operator, controller.getTrendCards);

  /**
   * GET /trends/:id
   * Get trend card by ID
   */
  router.get('/trends/:id', guards.operator, controller.getTrendCard);

  /**
   * POST /trends
   * Create new trend card
   */
  router.post('/trends', guards.operator, controller.createTrendCard);

  /**
   * PATCH /trends/:id
   * Update trend card
   */
  router.patch('/trends/:id', guards.operator, controller.updateTrendCard);

  /**
   * DELETE /trends/:id
   * Delete trend card
   */
  router.delete('/trends/:id', guards.operator, controller.deleteTrendCard);

  // ========================================================================
  // GLOBAL CONTENT ROUTES (Store - Read Only)
  // ========================================================================

  /**
   * GET /global/contents
   * List global contents for store consumption
   * Returns only published, active, valid-dated contents
   */
  router.get('/global/contents', guards.storeRead, controller.getGlobalContents);

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone route removed
  // Content copy is now handled via asset-snapshot-copy

  // ========================================================================
  // STATS ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /stats
   * Get content statistics
   */
  router.get('/stats', guards.operator, controller.getStats);

  return router;
}
