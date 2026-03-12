import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { TemplateService, initTemplateService } from '../services/TemplateService.js';

/**
 * TemplateController
 *
 * REST API for Template operations (package-level)
 * Base path: /templates
 */
export class TemplateController {
  private templateService: TemplateService;

  constructor(dataSource: DataSource) {
    this.templateService = initTemplateService(dataSource);
  }

  /**
   * Create routes
   */
  createRoutes(): Router {
    const router = Router();

    // Template CRUD
    router.get('/', this.list.bind(this));
    router.post('/', this.create.bind(this));
    router.get('/:id', this.getById.bind(this));
    router.put('/:id', this.update.bind(this));
    router.delete('/:id', this.delete.bind(this));

    // Version Management
    router.post('/:id/versions', this.createVersion.bind(this));
    router.get('/:id/versions', this.getVersions.bind(this));

    // Block Management
    router.get('/versions/:versionId/blocks', this.getBlocks.bind(this));
    router.post('/versions/:versionId/blocks', this.addBlock.bind(this));
    router.put('/blocks/:blockId', this.updateBlock.bind(this));
    router.delete('/blocks/:blockId', this.removeBlock.bind(this));
    router.post('/versions/:versionId/blocks/reorder', this.reorderBlocks.bind(this));

    // Publishing
    router.post('/:id/publish', this.publish.bind(this));
    router.post('/:id/archive', this.archive.bind(this));

    return router;
  }

  // ============================================
  // Template CRUD Handlers
  // ============================================

  private async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        type, status, visibility, organizationId,
        serviceKey, authorUserId, search, page, limit,
      } = req.query;

      const result = await this.templateService.list({
        type: type as any,
        status: status as any,
        visibility: visibility as any,
        organizationId: organizationId as string,
        serviceKey: serviceKey as string,
        authorUserId: authorUserId as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;
      if (!data.authorUserId && userId) {
        data.authorUserId = userId;
      }

      const template = await this.templateService.createTemplate(data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.templateService.findById(req.params.id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.templateService.update(req.params.id, req.body);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.templateService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Version Handlers
  // ============================================

  private async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = await this.templateService.createVersion(req.params.id, req.body);
      if (!version) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.status(201).json(version);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const versions = await this.templateService.getVersions(req.params.id);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Block Handlers
  // ============================================

  private async getBlocks(req: Request, res: Response): Promise<void> {
    try {
      const blocks = await this.templateService.getBlocks(req.params.versionId);
      res.json(blocks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async addBlock(req: Request, res: Response): Promise<void> {
    try {
      const block = await this.templateService.addBlock(req.params.versionId, req.body);
      res.status(201).json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async updateBlock(req: Request, res: Response): Promise<void> {
    try {
      const block = await this.templateService.updateBlock(req.params.blockId, req.body);
      if (!block) {
        res.status(404).json({ error: 'Block not found' });
        return;
      }
      res.json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async removeBlock(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.templateService.removeBlock(req.params.blockId);
      if (!deleted) {
        res.status(404).json({ error: 'Block not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async reorderBlocks(req: Request, res: Response): Promise<void> {
    try {
      const { blockIds } = req.body;
      const blocks = await this.templateService.reorderBlocks(req.params.versionId, blockIds);
      res.json(blocks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // Publishing Handlers
  // ============================================

  private async publish(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.templateService.publish(req.params.id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async archive(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.templateService.archive(req.params.id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

/**
 * Create template routes factory
 */
export function createTemplateRoutes(dataSource: DataSource): Router {
  const controller = new TemplateController(dataSource);
  return controller.createRoutes();
}
