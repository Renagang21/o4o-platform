/**
 * Pharmacy Extension - Routes
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * API Routes for Pharmacy Extension
 * Base path: /api/signage/:serviceKey/ext/pharmacy
 *
 * Route Groups:
 * - /hq/* : Operator (HQ) endpoints - require operator role
 * - /global/* : Store endpoints - require store read role
 * - /categories, /campaigns, /presets : Management endpoints
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { PharmacyController } from './controllers/pharmacy.controller.js';
import {
  createExtensionRouter,
  createExtensionGuards,
} from '../common/index.js';

/**
 * Create Pharmacy Extension Router
 */
export function createPharmacyRouter(dataSource: DataSource): Router {
  // Create base router with extension middleware
  const router = createExtensionRouter({
    extensionType: 'pharmacy',
    dataSource,
  });

  const controller = new PharmacyController(dataSource);
  const guards = createExtensionGuards('pharmacy');

  // ========================================================================
  // CATEGORY ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /categories
   * List all categories
   */
  router.get('/categories', guards.operator, controller.getCategories);

  /**
   * GET /categories/:id
   * Get category by ID
   */
  router.get('/categories/:id', guards.operator, controller.getCategory);

  /**
   * POST /categories
   * Create new category
   */
  router.post('/categories', guards.operator, controller.createCategory);

  /**
   * PATCH /categories/:id
   * Update category
   */
  router.patch('/categories/:id', guards.operator, controller.updateCategory);

  /**
   * DELETE /categories/:id
   * Delete category
   */
  router.delete('/categories/:id', guards.operator, controller.deleteCategory);

  // ========================================================================
  // CAMPAIGN ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /campaigns
   * List all seasonal campaigns
   */
  router.get('/campaigns', guards.operator, controller.getCampaigns);

  /**
   * GET /campaigns/:id
   * Get campaign by ID
   */
  router.get('/campaigns/:id', guards.operator, controller.getCampaign);

  /**
   * POST /campaigns
   * Create new campaign
   */
  router.post('/campaigns', guards.operator, controller.createCampaign);

  /**
   * PATCH /campaigns/:id
   * Update campaign
   */
  router.patch('/campaigns/:id', guards.operator, controller.updateCampaign);

  /**
   * DELETE /campaigns/:id
   * Delete campaign
   */
  router.delete('/campaigns/:id', guards.operator, controller.deleteCampaign);

  // ========================================================================
  // TEMPLATE PRESET ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /presets
   * List all template presets
   */
  router.get('/presets', guards.operator, controller.getTemplatePresets);

  /**
   * GET /presets/:id
   * Get preset by ID
   */
  router.get('/presets/:id', guards.operator, controller.getTemplatePreset);

  /**
   * POST /presets
   * Create new preset
   */
  router.post('/presets', guards.operator, controller.createTemplatePreset);

  /**
   * PATCH /presets/:id
   * Update preset
   */
  router.patch('/presets/:id', guards.operator, controller.updateTemplatePreset);

  // ========================================================================
  // HQ CONTENT ROUTES (Operator only)
  // ========================================================================

  /**
   * GET /hq/contents
   * List all HQ contents (operator view)
   */
  router.get('/hq/contents', guards.operator, controller.getContents);

  /**
   * GET /hq/contents/:id
   * Get content by ID (operator view)
   */
  router.get('/hq/contents/:id', guards.operator, controller.getContent);

  /**
   * POST /hq/contents
   * Create new content
   */
  router.post('/hq/contents', guards.operator, controller.createContent);

  /**
   * PATCH /hq/contents/:id
   * Update content
   */
  router.patch('/hq/contents/:id', guards.operator, controller.updateContent);

  /**
   * DELETE /hq/contents/:id
   * Delete content (soft delete)
   */
  router.delete('/hq/contents/:id', guards.operator, controller.deleteContent);

  /**
   * GET /hq/stats
   * Get content statistics
   */
  router.get('/hq/stats', guards.operator, controller.getStats);

  // ========================================================================
  // GLOBAL CONTENT ROUTES (Store - Read Only)
  // ========================================================================

  /**
   * GET /global/contents
   * List global contents for store consumption
   * Returns only published, active, valid-dated contents
   */
  router.get('/global/contents', guards.storeRead, controller.getGlobalContents);

  /**
   * POST /global/contents/:id/clone
   * Clone a global content to store
   * Forced content cannot be cloned
   */
  router.post('/global/contents/:id/clone', guards.store, controller.cloneContent);

  return router;
}
