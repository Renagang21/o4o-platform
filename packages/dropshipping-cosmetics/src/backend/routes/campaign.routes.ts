/**
 * Campaign Routes
 *
 * REST API endpoints for cosmetics campaigns
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CampaignService } from '../services/campaign.service.js';
import { CampaignController } from '../controllers/campaign.controller.js';

export function createCampaignRoutes(dataSource: DataSource): Router {
  const router = Router();
  const campaignService = new CampaignService(dataSource);
  const campaignController = new CampaignController(campaignService);

  /**
   * POST /api/v1/cosmetics/campaigns/auto
   * Generate auto campaign based on filters
   * Must come before /:id route
   */
  router.post('/campaigns/auto', (req, res) =>
    campaignController.generateAutoCampaign(req, res)
  );

  /**
   * POST /api/v1/cosmetics/campaigns
   * Create a new campaign
   */
  router.post('/campaigns', (req, res) =>
    campaignController.createCampaign(req, res)
  );

  /**
   * GET /api/v1/cosmetics/campaigns
   * List campaigns with filtering and pagination
   */
  router.get('/campaigns', (req, res) =>
    campaignController.listCampaigns(req, res)
  );

  /**
   * GET /api/v1/cosmetics/campaigns/:id
   * Get campaign by ID
   */
  router.get('/campaigns/:id', (req, res) =>
    campaignController.getCampaign(req, res)
  );

  /**
   * PUT /api/v1/cosmetics/campaigns/:id
   * Update campaign
   */
  router.put('/campaigns/:id', (req, res) =>
    campaignController.updateCampaign(req, res)
  );

  /**
   * DELETE /api/v1/cosmetics/campaigns/:id
   * Delete campaign
   */
  router.delete('/campaigns/:id', (req, res) =>
    campaignController.deleteCampaign(req, res)
  );

  return router;
}
