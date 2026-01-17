/**
 * SurveyCampaignController
 *
 * SurveyCampaign CRUD 및 캠페인 관리 API
 * Base path: /api/v1/lms/marketing/survey-campaigns
 */

import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { SurveyCampaignService } from '../services/SurveyCampaignService.js';

export class SurveyCampaignController {
  private service: SurveyCampaignService;

  constructor(dataSource: DataSource) {
    this.service = new SurveyCampaignService(dataSource);
  }

  // ============================================
  // CRUD
  // ============================================

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const entity = await this.service.create(data);
      res.status(201).json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await this.service.findById(id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        surveyId: req.query.surveyId as string,
        status: req.query.status as any,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const result = await this.service.findAll(filters);
      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / filters.limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      const entity = await this.service.update(id, data);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.service.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================
  // Campaign Status
  // ============================================

  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await this.service.activate(id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async pause(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await this.service.pause(id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await this.service.complete(id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async archive(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await this.service.archive(id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'SurveyCampaign not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================
  // Active Campaigns
  // ============================================

  async findActive(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.service.findActive();
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================
  // Statistics Recording (from Core Survey events)
  // ============================================

  async recordResponse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.recordResponse(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async recordCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.recordCompleted(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
