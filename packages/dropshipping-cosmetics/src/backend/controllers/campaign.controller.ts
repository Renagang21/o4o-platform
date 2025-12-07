/**
 * Campaign Controller
 *
 * Handles HTTP requests for cosmetics campaigns
 */

import { Request, Response } from 'express';
import {
  CampaignService,
  CreateCampaignDTO,
  UpdateCampaignDTO,
  AutoCampaignFilters,
  CampaignListOptions,
} from '../services/campaign.service.js';

export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  /**
   * POST /api/v1/cosmetics/campaigns
   * Create a new campaign
   */
  async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateCampaignDTO = {
        title: req.body.title,
        type: req.body.type,
        brandId: req.body.brandId,
        category: req.body.category,
        concerns: req.body.concerns,
        products: req.body.products,
        routines: req.body.routines,
        signagePlaylistId: req.body.signagePlaylistId,
        metadata: req.body.metadata,
      };

      // Validate required fields
      if (!dto.title || dto.title.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Campaign title is required',
        });
        return;
      }

      if (!dto.type) {
        res.status(400).json({
          success: false,
          message: 'Campaign type is required',
        });
        return;
      }

      const campaign = await this.campaignService.createCampaign(dto);

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully',
      });
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/campaigns/:id
   * Get campaign by ID
   */
  async getCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await this.campaignService.getCampaign(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/campaigns
   * List campaigns with filtering and pagination
   */
  async listCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const options: CampaignListOptions = {
        type: req.query.type as any,
        status: req.query.status as string,
        brandId: req.query.brandId as string,
        category: req.query.category as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.campaignService.listCampaigns(options);

      res.json({
        success: true,
        data: result.campaigns,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('Error listing campaigns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list campaigns',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/campaigns/:id
   * Update campaign
   */
  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateCampaignDTO = {
        title: req.body.title,
        type: req.body.type,
        brandId: req.body.brandId,
        category: req.body.category,
        concerns: req.body.concerns,
        products: req.body.products,
        routines: req.body.routines,
        signagePlaylistId: req.body.signagePlaylistId,
        metadata: req.body.metadata,
      };

      const campaign = await this.campaignService.updateCampaign(id, dto);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update campaign',
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics/campaigns/:id
   * Delete campaign
   */
  async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.campaignService.deleteCampaign(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete campaign',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/campaigns/auto
   * Generate auto campaign based on filters
   */
  async generateAutoCampaign(req: Request, res: Response): Promise<void> {
    try {
      const filters: AutoCampaignFilters = {
        brandId: req.body.brandId,
        category: req.body.category,
        concerns: req.body.concerns,
        includeRoutines: req.body.includeRoutines || false,
        maxProducts: req.body.maxProducts || 10,
        maxRoutines: req.body.maxRoutines || 3,
        period: req.body.period,
      };

      const campaign = await this.campaignService.generateAutoCampaign(filters);

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Auto campaign generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating auto campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate auto campaign',
        error: error.message,
      });
    }
  }
}
