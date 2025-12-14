/**
 * MarketingQuizCampaignController
 *
 * REST API controller for quiz campaign management.
 */

import type { Request, Response } from 'express';
import {
  MarketingQuizCampaignService,
  type CreateQuizCampaignDto,
  type UpdateQuizCampaignDto,
  type QuizUserContext,
  type QuizAttemptResult,
} from '../services/MarketingQuizCampaignService.js';

export class MarketingQuizCampaignController {
  constructor(private service: MarketingQuizCampaignService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateQuizCampaignDto = req.body;

      if (!dto.supplierId || !dto.title) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: supplierId, title',
        });
        return;
      }

      const result = await this.service.create(dto);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create quiz campaign',
      });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getById(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] getById error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quiz campaign',
      });
    }
  }

  async getBySupplier(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { status, isActive } = req.query;

      const options: { status?: string; isActive?: boolean } = {};
      if (status) {
        options.status = status as string;
      }
      if (isActive !== undefined) {
        options.isActive = isActive === 'true';
      }

      const results = await this.service.getBySupplier(supplierId, options as any);
      res.json({
        success: true,
        data: results,
        total: results.length,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] getBySupplier error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supplier quiz campaigns',
      });
    }
  }

  async getTargeted(req: Request, res: Response): Promise<void> {
    try {
      const { role, region, sellerType, tags } = req.query;

      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: role',
        });
        return;
      }

      const userContext: QuizUserContext = {
        role: role as QuizUserContext['role'],
        region: region as string | undefined,
        sellerType: sellerType as string | undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const results = await this.service.getForUser(userContext);
      res.json({
        success: true,
        data: results,
        total: results.length,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] getTargeted error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get targeted quiz campaigns',
      });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId, status, isActive, isPublished, limit, offset } = req.query;

      const options = {
        supplierId: supplierId as string | undefined,
        status: status as string | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await this.service.list(options as any);
      res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list quiz campaigns',
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateQuizCampaignDto = req.body;

      const result = await this.service.update(id, dto);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update quiz campaign',
      });
    }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.publish(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MarketingQuizCampaignController] publish error:', error);
      if (error.message === 'Cannot publish campaign without questions') {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to publish quiz campaign',
      });
    }
  }

  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.unpublish(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] unpublish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish quiz campaign',
      });
    }
  }

  async recordAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const attemptData = req.body;

      const result: QuizAttemptResult = {
        campaignId: id,
        userId: attemptData.userId,
        answers: attemptData.answers,
        score: attemptData.score,
        totalPoints: attemptData.totalPoints,
        passed: attemptData.passed,
        completedAt: new Date(),
        timeSpentSeconds: attemptData.timeSpentSeconds,
      };

      await this.service.recordAttempt(result);

      res.json({
        success: true,
        message: 'Quiz attempt recorded',
      });
    } catch (error: any) {
      console.error('[MarketingQuizCampaignController] recordAttempt error:', error);
      if (error.message === 'Campaign not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to record quiz attempt',
      });
    }
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getStatistics(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] getStatistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get campaign statistics',
      });
    }
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.deactivate(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] deactivate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate quiz campaign',
      });
    }
  }

  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.activate(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] activate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate quiz campaign',
      });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.service.delete(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Quiz campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Quiz campaign deleted',
      });
    } catch (error) {
      console.error('[MarketingQuizCampaignController] delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete quiz campaign',
      });
    }
  }
}
