import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageContentService } from '../services/content.service.js';
import { extractScope, extractUserId } from './signage-helpers.js';
import type {
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ContentBlockQueryDto,
  CreateLayoutPresetDto,
  UpdateLayoutPresetDto,
  LayoutPresetQueryDto,
  AiGenerateRequestDto,
} from '../dto/index.js';

export class SignageContentController {
  private service: SignageContentService;

  constructor(dataSource: DataSource) {
    this.service = new SignageContentService(dataSource);
  }

  // ========== Content Block Endpoints ==========

  getContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const block = await this.service.getContentBlock(id, scope);
      if (!block) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  getContentBlocks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const query: ContentBlockQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        blockType: req.query.blockType as string,
        status: req.query.status as any,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getContentBlocks(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const dto: CreateContentBlockDto = req.body;

      const block = await this.service.createContentBlock(dto, scope, userId);
      res.status(201).json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  updateContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const dto: UpdateContentBlockDto = req.body;

      const block = await this.service.updateContentBlock(id, dto, scope);
      if (!block) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  deleteContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteContentBlock(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Layout Preset Endpoints ==========

  getLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const { id } = req.params;

      const preset = await this.service.getLayoutPreset(id, serviceKey);
      if (!preset) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  getLayoutPresets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const query: LayoutPresetQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getLayoutPresets(query, serviceKey);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const dto: CreateLayoutPresetDto = req.body;

      const preset = await this.service.createLayoutPreset(dto, serviceKey);
      res.status(201).json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  updateLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateLayoutPresetDto = req.body;

      const preset = await this.service.updateLayoutPreset(id, dto);
      if (!preset) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  deleteLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const success = await this.service.deleteLayoutPreset(id);
      if (!success) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== AI Generation ==========

  generateWithAi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const dto: AiGenerateRequestDto = req.body;

      const result = await this.service.generateWithAi(dto, scope, userId);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
