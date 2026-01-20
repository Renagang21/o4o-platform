/**
 * Cosmetics Extension - Controller
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * HTTP request handlers for Cosmetics Extension API
 */

import type { Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { CosmeticsService } from '../services/cosmetics.service.js';
import type { ExtensionRequest } from '../../common/extension.router.js';

/**
 * Cosmetics Controller
 */
export class CosmeticsController {
  private service: CosmeticsService;

  constructor(dataSource: DataSource) {
    this.service = new CosmeticsService(dataSource);
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

  // ========== BRAND ENDPOINTS ==========

  getBrands = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        category: req.query.category as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.service.getBrands(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getBrand = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getBrand(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Brand not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createBrand = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createBrand(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateBrand = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateBrand(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Brand not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteBrand = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteBrand(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Brand not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== CONTENT PRESET ENDPOINTS ==========

  getContentPresets = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        type: req.query.type as string | undefined,
        brandId: req.query.brandId as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };

      const result = await this.service.getContentPresets(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getContentPreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getContentPreset(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Content preset not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createContentPreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createContentPreset(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateContentPreset = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateContentPreset(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Content preset not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  // ========== BRAND CONTENT ENDPOINTS ==========

  getBrandContents = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        brandId: req.query.brandId as string | undefined,
        contentType: req.query.contentType as string | undefined,
        scope: req.query.scope as string | undefined,
        status: req.query.status as string | undefined,
        season: req.query.season as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.service.getBrandContents(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getBrandContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getBrandContent(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Brand content not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createBrandContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createBrandContent(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateBrandContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateBrandContent(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Brand content not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteBrandContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteBrandContent(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Brand content not found' });
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
        brandId: req.query.brandId as string | undefined,
        contentType: req.query.contentType as string | undefined,
        season: req.query.season as string | undefined,
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

  // ========== TREND CARD ENDPOINTS ==========

  getTrendCards = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        trendType: req.query.trendType as string | undefined,
        season: req.query.season as string | undefined,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };

      const result = await this.service.getTrendCards(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getTrendCard = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getTrendCard(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Trend card not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createTrendCard = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createTrendCard(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateTrendCard = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updateTrendCard(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Trend card not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteTrendCard = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deleteTrendCard(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Trend card not found' });
        return;
      }

      res.status(204).send();
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
