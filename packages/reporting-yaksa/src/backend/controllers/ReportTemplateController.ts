import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import {
  ReportTemplateService,
  type CreateTemplateDto,
  type UpdateTemplateDto,
} from '../services/ReportTemplateService.js';

/**
 * ReportTemplateController
 *
 * 신상신고 템플릿 관리 API 컨트롤러 (Express Request/Response 스타일)
 */
export class ReportTemplateController {
  private templateService: ReportTemplateService;

  constructor(templateService: ReportTemplateService) {
    this.templateService = templateService;
  }

  /**
   * GET /api/reporting/templates
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const filter =
        req.query.active !== undefined
          ? { active: req.query.active === 'true' }
          : undefined;

      const templates = await this.templateService.list(filter);

      res.json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/templates/current
   */
  async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.templateService.findCurrentActive();

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/templates/:id
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await this.templateService.findById(id);

      if (!template) {
        res.status(404).json({ success: false, error: `Template "${id}" not found` });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/templates/year/:year
   */
  async getByYear(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.params.year, 10);
      const template = await this.templateService.findByYear(year);

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/templates
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateTemplateDto = req.body;
      const template = await this.templateService.create(dto);

      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/reporting/templates/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateTemplateDto = req.body;
      const template = await this.templateService.update(id, dto);

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/reporting/templates/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.templateService.delete(id);

      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/reporting/templates/:id/activate
   */
  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await this.templateService.setActive(id, true);

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/reporting/templates/:id/deactivate
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await this.templateService.setActive(id, false);

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/templates/:id/duplicate
   */
  async duplicate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetYear } = req.body;

      if (!targetYear) {
        res.status(400).json({ success: false, error: 'Target year is required' });
        return;
      }

      const template = await this.templateService.duplicateForYear(id, targetYear);

      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
