import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageTemplateService } from '../services/template.service.js';
import { extractScope, extractUserId } from './signage-helpers.js';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  CreateTemplateZoneDto,
  UpdateTemplateZoneDto,
  TemplatePreviewDto,
} from '../dto/index.js';

export class SignageTemplateController {
  private service: SignageTemplateService;

  constructor(dataSource: DataSource) {
    this.service = new SignageTemplateService(dataSource);
  }

  getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const template = await this.service.getTemplate(id, scope);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const query: TemplateQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as any,
        isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getTemplates(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const dto: CreateTemplateDto = req.body;

      const template = await this.service.createTemplate(dto, scope, userId);
      res.status(201).json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const dto: UpdateTemplateDto = req.body;

      const template = await this.service.updateTemplate(id, dto, scope);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteTemplate(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Template Zone Endpoints ==========

  getTemplateZones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { templateId } = req.params;

      const zones = await this.service.getTemplateZones(templateId, scope);
      res.json({ data: zones });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  addTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { templateId } = req.params;
      const dto: CreateTemplateZoneDto = req.body;

      const zone = await this.service.addTemplateZone(templateId, dto, scope);
      res.status(201).json({ data: zone });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  updateTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { templateId, zoneId } = req.params;
      const dto: UpdateTemplateZoneDto = req.body;

      const zone = await this.service.updateTemplateZone(templateId, zoneId, dto, scope);
      if (!zone) {
        res.status(404).json({ error: 'Template zone not found' });
        return;
      }

      res.json({ data: zone });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  deleteTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { templateId, zoneId } = req.params;

      const success = await this.service.deleteTemplateZone(templateId, zoneId, scope);
      if (!success) {
        res.status(404).json({ error: 'Template zone not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  previewTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const dto: TemplatePreviewDto = req.body;

      const preview = await this.service.generateTemplatePreview(dto, scope);
      res.json({ data: preview });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };
}
