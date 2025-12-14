/**
 * SurveyCampaignController
 *
 * REST API controller for survey campaign management.
 *
 * Phase R8: Survey Campaign Module
 */

import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import {
  SurveyCampaignService,
  type CreateSurveyCampaignDto,
  type UpdateSurveyCampaignDto,
  type SubmitSurveyResponseDto,
} from '../services/SurveyCampaignService.js';

/**
 * SurveyCampaignController
 */
export class SurveyCampaignController {
  private service: SurveyCampaignService;

  constructor(dataSource: DataSource) {
    this.service = new SurveyCampaignService(dataSource);
  }

  /**
   * Create a new survey campaign
   * POST /survey-campaign
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateSurveyCampaignDto = {
        supplierId: req.body.supplierId,
        surveyId: req.body.surveyId,
        title: req.body.title,
        description: req.body.description,
        bundleId: req.body.bundleId,
        questions: req.body.questions,
        targeting: req.body.targeting,
        reward: req.body.reward,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        allowAnonymous: req.body.allowAnonymous,
        maxResponses: req.body.maxResponses,
        metadata: req.body.metadata,
      };

      // Validation
      if (!dto.supplierId) {
        res.status(400).json({
          success: false,
          error: 'supplierId is required',
        });
        return;
      }

      if (!dto.title) {
        res.status(400).json({
          success: false,
          error: 'title is required',
        });
        return;
      }

      const campaign = await this.service.create(dto);

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] Create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create survey campaign',
      });
    }
  }

  /**
   * Get all survey campaigns
   * GET /survey-campaign
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const options = {
        supplierId: req.query.supplierId as string | undefined,
        status: req.query.status as any,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.service.findAll(options);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] FindAll error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch survey campaigns',
      });
    }
  }

  /**
   * Get a survey campaign by ID
   * GET /survey-campaign/:id
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.service.findById(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] FindById error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch survey campaign',
      });
    }
  }

  /**
   * Get campaigns for a supplier
   * GET /survey-campaign/supplier/:supplierId
   */
  async findBySupplier(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const options = {
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.service.findBySupplier(supplierId, options);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] FindBySupplier error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier campaigns',
      });
    }
  }

  /**
   * Get active campaigns for current user
   * GET /survey-campaign/active
   */
  async getActiveCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        role: (req.query.role as any) || 'all',
        region: req.query.region as string | undefined,
        sellerType: req.query.sellerType as string | undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const campaigns = await this.service.getForUser(filter);

      res.json({
        success: true,
        data: campaigns,
        total: campaigns.length,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] GetActiveCampaigns error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active campaigns',
      });
    }
  }

  /**
   * Update a survey campaign
   * PUT /survey-campaign/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateSurveyCampaignDto = {
        title: req.body.title,
        description: req.body.description,
        surveyId: req.body.surveyId,
        bundleId: req.body.bundleId,
        questions: req.body.questions,
        targeting: req.body.targeting,
        reward: req.body.reward,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        allowAnonymous: req.body.allowAnonymous,
        maxResponses: req.body.maxResponses,
        metadata: req.body.metadata,
      };

      const campaign = await this.service.update(id, dto);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      console.error('[SurveyCampaignController] Update error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update survey campaign',
      });
    }
  }

  /**
   * Publish a survey campaign
   * POST /survey-campaign/:id/publish
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.service.publish(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      console.error('[SurveyCampaignController] Publish error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to publish survey campaign',
      });
    }
  }

  /**
   * Unpublish a survey campaign
   * POST /survey-campaign/:id/unpublish
   */
  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.service.unpublish(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] Unpublish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish survey campaign',
      });
    }
  }

  /**
   * End a survey campaign
   * POST /survey-campaign/:id/end
   */
  async end(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.service.end(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] End error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end survey campaign',
      });
    }
  }

  /**
   * Submit a survey response
   * POST /survey-campaign/:id/submit
   */
  async submitResponse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: SubmitSurveyResponseDto = {
        userId: req.body.userId,
        isAnonymous: req.body.isAnonymous ?? false,
        answers: req.body.answers || [],
        metadata: req.body.metadata,
      };

      // Validation
      if (!dto.answers || dto.answers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'answers are required',
        });
        return;
      }

      const result = await this.service.recordResponse(id, dto);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] SubmitResponse error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit survey response',
      });
    }
  }

  /**
   * Get campaign statistics
   * GET /survey-campaign/:id/stats
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.service.getStatistics(id);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[SurveyCampaignController] GetStatistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign statistics',
      });
    }
  }

  /**
   * Delete a survey campaign (soft delete)
   * DELETE /survey-campaign/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.service.delete(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Survey campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Survey campaign deleted',
      });
    } catch (error) {
      console.error('[SurveyCampaignController] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete survey campaign',
      });
    }
  }
}
