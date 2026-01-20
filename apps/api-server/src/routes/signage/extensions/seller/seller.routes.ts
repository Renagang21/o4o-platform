/**
 * Seller Extension - Routes
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * API Routes for Seller Extension
 * Base path: /api/signage/:serviceKey/ext/seller
 *
 * Route Groups:
 * - /partners/* : Partner management - require admin role
 * - /campaigns/* : Campaign management - require operator/partner role
 * - /contents/* : Content management - require operator/partner role
 * - /global/* : Store endpoints - require store read role
 * - /metrics/* : Metrics endpoints - require operator role
 * - /stats : Statistics endpoint - require admin role
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SellerController } from './controllers/seller.controller.js';
import {
  createExtensionRouter,
  createExtensionGuards,
  requireSellerAdmin,
  requireSellerPartner,
} from '../common/index.js';

/**
 * Create Seller Extension Router
 */
export function createSellerRouter(dataSource: DataSource): Router {
  // Create base router with extension middleware
  const router = createExtensionRouter({
    extensionType: 'seller',
    dataSource,
  });

  const controller = new SellerController(dataSource);
  const guards = createExtensionGuards('seller');

  // ========================================================================
  // PARTNER ROUTES (Admin only)
  // ========================================================================

  /**
   * GET /partners
   * List all partners
   */
  router.get('/partners', requireSellerAdmin, controller.getPartners);

  /**
   * GET /partners/:id
   * Get partner by ID
   */
  router.get('/partners/:id', requireSellerAdmin, controller.getPartner);

  /**
   * POST /partners
   * Create new partner
   */
  router.post('/partners', requireSellerAdmin, controller.createPartner);

  /**
   * PATCH /partners/:id
   * Update partner
   */
  router.patch('/partners/:id', requireSellerAdmin, controller.updatePartner);

  /**
   * DELETE /partners/:id
   * Delete partner
   */
  router.delete('/partners/:id', requireSellerAdmin, controller.deletePartner);

  // ========================================================================
  // CAMPAIGN ROUTES (Operator/Partner)
  // ========================================================================

  /**
   * GET /campaigns
   * List campaigns
   * Partner can only see their own campaigns
   */
  router.get('/campaigns', requireSellerPartner, controller.getCampaigns);

  /**
   * GET /campaigns/:id
   * Get campaign by ID
   */
  router.get('/campaigns/:id', requireSellerPartner, controller.getCampaign);

  /**
   * POST /campaigns
   * Create new campaign
   */
  router.post('/campaigns', requireSellerPartner, controller.createCampaign);

  /**
   * PATCH /campaigns/:id
   * Update campaign
   */
  router.patch('/campaigns/:id', requireSellerPartner, controller.updateCampaign);

  /**
   * POST /campaigns/:id/approve
   * Approve or reject campaign (Admin only)
   */
  router.post('/campaigns/:id/approve', requireSellerAdmin, controller.approveCampaign);

  /**
   * DELETE /campaigns/:id
   * Delete campaign
   */
  router.delete('/campaigns/:id', requireSellerPartner, controller.deleteCampaign);

  // ========================================================================
  // CONTENT ROUTES (Operator/Partner)
  // ========================================================================

  /**
   * GET /contents
   * List contents
   * Partner can only see their own contents
   */
  router.get('/contents', requireSellerPartner, controller.getContents);

  /**
   * GET /contents/:id
   * Get content by ID
   */
  router.get('/contents/:id', requireSellerPartner, controller.getContent);

  /**
   * POST /contents
   * Create new content
   */
  router.post('/contents', requireSellerPartner, controller.createContent);

  /**
   * PATCH /contents/:id
   * Update content
   */
  router.patch('/contents/:id', requireSellerPartner, controller.updateContent);

  /**
   * POST /contents/:id/approve
   * Approve or reject content (Admin only)
   */
  router.post('/contents/:id/approve', requireSellerAdmin, controller.approveContent);

  /**
   * DELETE /contents/:id
   * Delete content (soft delete)
   */
  router.delete('/contents/:id', requireSellerPartner, controller.deleteContent);

  // ========================================================================
  // GLOBAL CONTENT ROUTES (Store - Read Only)
  // ========================================================================

  /**
   * GET /global/contents
   * List global contents for store consumption
   * Returns only approved, active, campaign-valid contents
   */
  router.get('/global/contents', guards.storeRead, controller.getGlobalContents);

  /**
   * POST /global/contents/:id/clone
   * Clone a global content to store
   * All seller content can be cloned (no Force restriction)
   */
  router.post('/global/contents/:id/clone', guards.store, controller.cloneContent);

  // ========================================================================
  // METRICS ROUTES
  // ========================================================================

  /**
   * POST /metrics
   * Record a metric event (from Player)
   */
  router.post('/metrics', guards.store, controller.recordMetric);

  /**
   * GET /metrics
   * Get metrics summary (Admin/Operator)
   */
  router.get('/metrics', requireSellerAdmin, controller.getMetrics);

  // ========================================================================
  // STATS ROUTES (Admin only)
  // ========================================================================

  /**
   * GET /stats
   * Get content statistics
   */
  router.get('/stats', requireSellerAdmin, controller.getStats);

  return router;
}
