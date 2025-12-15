/**
 * Campaign Publisher Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * POST /api/v1/partner/campaign - 캠페인 생성
 * GET /api/v1/partner/campaign/:id - 캠페인 조회
 * PUT /api/v1/partner/campaign/:id - 캠페인 수정
 * DELETE /api/v1/partner/campaign/:id - 캠페인 삭제
 * POST /api/v1/partner/campaign/:id/publish - 캠페인 발행
 * GET /api/v1/partner/campaign/templates - 템플릿 목록
 * GET /api/v1/partner/campaign/:id/analytics - 캠페인 분석
 */

import { Request, Response } from 'express';
import { CampaignPublisherService, CampaignDto } from '../services/campaign-publisher.service.js';

export class CampaignPublisherController {
  constructor(private campaignService: CampaignPublisherService) {}

  /**
   * Create campaign
   * POST /campaign
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CampaignDto = req.body;

      if (!dto.partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
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

      if (!dto.type) {
        res.status(400).json({
          success: false,
          error: 'type is required (product_launch, seasonal, flash_sale, routine_share, custom)',
        });
        return;
      }

      const campaign = await this.campaignService.createCampaign(dto);

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign',
      });
    }
  }

  /**
   * Get campaign by ID
   * GET /campaign/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await this.campaignService.getCampaign(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign',
      });
    }
  }

  /**
   * Get campaigns by partner
   * GET /campaign/partner/:partnerId
   */
  async getByPartner(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;

      const campaigns = await this.campaignService.getCampaignsByPartner(partnerId);

      res.status(200).json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaigns',
      });
    }
  }

  /**
   * Update campaign
   * PUT /campaign/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: Partial<CampaignDto> = req.body;

      const campaign = await this.campaignService.updateCampaign(id, updates);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign',
      });
    }
  }

  /**
   * Delete campaign
   * DELETE /campaign/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.campaignService.deleteCampaign(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete campaign',
      });
    }
  }

  /**
   * Publish campaign
   * POST /campaign/:id/publish
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await this.campaignService.publishCampaign(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error publishing campaign:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish campaign',
      });
    }
  }

  /**
   * Pause campaign
   * POST /campaign/:id/pause
   */
  async pause(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await this.campaignService.pauseCampaign(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error pausing campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause campaign',
      });
    }
  }

  /**
   * Get campaign templates
   * GET /campaign/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.campaignService.getTemplates();

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
      });
    }
  }

  /**
   * Create campaign from template
   * POST /campaign/from-template
   */
  async createFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId, templateId, overrides } = req.body;

      if (!partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: 'templateId is required',
        });
        return;
      }

      const campaign = await this.campaignService.createFromTemplate(
        partnerId,
        templateId,
        overrides
      );

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('Error creating campaign from template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign',
      });
    }
  }

  /**
   * Generate campaign content
   * POST /campaign/:id/generate-content
   */
  async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const options = req.body;

      const content = await this.campaignService.generateContent(id, options);

      res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error('Error generating content:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content',
      });
    }
  }

  /**
   * Get campaign analytics
   * GET /campaign/:id/analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const analytics = await this.campaignService.getAnalytics(id);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      });
    }
  }
}
