/**
 * Seller Extension - Controller
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * HTTP request handlers for Seller Extension API
 */

import type { Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SellerService } from '../services/seller.service.js';
import type { ExtensionRequest } from '../../common/extension.router.js';

/**
 * Seller Controller
 */
export class SellerController {
  private service: SellerService;

  constructor(dataSource: DataSource) {
    this.service = new SellerService(dataSource);
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

  /**
   * Get user ID from request
   */
  private getUserId(req: ExtensionRequest): string {
    return (req as any).user?.id || 'system';
  }

  // ========== PARTNER ENDPOINTS ==========

  getPartners = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        tier: req.query.tier as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.service.getPartners(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getPartner = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.getPartner(req.params.id, scope);

      if (!result) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  createPartner = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.createPartner(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updatePartner = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.updatePartner(req.params.id, req.body, scope);

      if (!result) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deletePartner = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const success = await this.service.deletePartner(req.params.id, scope);

      if (!success) {
        res.status(404).json({ error: 'Partner not found' });
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
        partnerId: req.query.partnerId as string | undefined,
        status: req.query.status as string | undefined,
        campaignType: req.query.campaignType as string | undefined,
        activeOnly: req.query.activeOnly === 'true',
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

  approveCampaign = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const userId = this.getUserId(req);
      const result = await this.service.approveCampaign(req.params.id, req.body, userId, scope);

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

  // ========== CONTENT ENDPOINTS ==========

  getContents = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        partnerId: req.query.partnerId as string | undefined,
        campaignId: req.query.campaignId as string | undefined,
        contentType: req.query.contentType as string | undefined,
        status: req.query.status as string | undefined,
        scope: req.query.scope as string | undefined,
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

  approveContent = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const userId = this.getUserId(req);
      const result = await this.service.approveContent(req.params.id, req.body, userId, scope);

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
        partnerId: req.query.partnerId as string | undefined,
        contentType: req.query.contentType as string | undefined,
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

  // ========== METRICS ENDPOINTS ==========

  recordMetric = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const result = await this.service.recordMetric(req.body, scope);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: ExtensionRequest, res: Response, next: NextFunction) => {
    try {
      const scope = this.getScope(req);
      const query = {
        contentId: req.query.contentId as string | undefined,
        partnerId: req.query.partnerId as string | undefined,
        campaignId: req.query.campaignId as string | undefined,
        storeId: req.query.storeId as string | undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        groupBy: req.query.groupBy as 'day' | 'week' | 'month' | undefined,
      };

      const result = await this.service.getMetricsSummary(query, scope);
      res.json({ data: result });
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
