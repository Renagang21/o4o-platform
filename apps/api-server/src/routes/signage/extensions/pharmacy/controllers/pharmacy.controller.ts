/**
 * Pharmacy Extension - Controller
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * HTTP request handlers for Pharmacy Extension API
 */

import type { Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { PharmacyService } from '../services/pharmacy.service.js';
import type { ExtensionRequest } from '../../common/extension.router.js';

/**
 * Pharmacy Controller
 */
export class PharmacyController {
  private service: PharmacyService;

  constructor(dataSource: DataSource) {
    this.service = new PharmacyService(dataSource);
  }

  /**
   * Get scope from request
   */
  private getScope(req: ExtensionRequest): { organizationId: string } {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return { organizationId };
  }

  // ========== CATEGORY ENDPOINTS ==========

  getCategories = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        parentId: req.query.parentId as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };

      const result = await this.service.getCategories(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCategory = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getCategory(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createCategory(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateCategory(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteCategory(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== CAMPAIGN ENDPOINTS ==========

  getCampaigns = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        season: req.query.season as string | undefined,
        scope: req.query.scope as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        current: req.query.current === 'true',
      };

      const result = await this.service.getCampaigns(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCampaign = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getCampaign(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createCampaign = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createCampaign(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateCampaign = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateCampaign(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteCampaign = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteCampaign(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== TEMPLATE PRESET ENDPOINTS ==========

  getTemplatePresets = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const type = req.query.type as string | undefined;
      const result = await this.service.getTemplatePresets(scope, type);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  getTemplatePreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getTemplatePreset(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Template preset not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createTemplatePreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createTemplatePreset(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateTemplatePreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateTemplatePreset(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Template preset not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  // ========== CONTENT ENDPOINTS (HQ/Operator) ==========

  getContents = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        source: req.query.source as string | undefined,
        scope: req.query.scope as string | undefined,
        status: req.query.status as string | undefined,
        contentType: req.query.contentType as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        campaignId: req.query.campaignId as string | undefined,
        isForced: req.query.isForced === 'true' ? true : req.query.isForced === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.service.getContents(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getContent(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createContent(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateContent(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteContent(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== GLOBAL CONTENT ENDPOINTS (Store) ==========

  getGlobalContents = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        source: req.query.source as string | undefined,
        contentType: req.query.contentType as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        isForced: req.query.isForced === 'true' ? true : req.query.isForced === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.service.getGlobalContents(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  cloneContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.cloneContent(req.params.id, req.body || {}, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  // ========== STATS ENDPOINTS ==========

  getStats = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getContentStats(scope);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
