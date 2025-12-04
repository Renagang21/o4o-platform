import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PageService } from '../services/PageService.js';
import logger from '../../../utils/logger.js';

/**
 * PageController
 * NextGen V2 - CMS Module
 * Handles Page CRUD and publishing operations
 */
export class PageController extends BaseController {
  static async createPage(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = PageService.getInstance();

      const page = await service.createPage(data);

      return BaseController.created(res, { page });
    } catch (error: any) {
      logger.error('[PageController.createPage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getPage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = PageService.getInstance();

      const page = await service.getPage(id);

      if (!page) {
        return BaseController.notFound(res, 'Page not found');
      }

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.getPage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getPageBySlug(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const service = PageService.getInstance();

      const page = await service.getPageBySlug(slug);

      if (!page) {
        return BaseController.notFound(res, 'Page not found');
      }

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.getPageBySlug] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listPages(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = PageService.getInstance();

      const { pages, total } = await service.listPages(filters as any);

      return BaseController.okPaginated(res, pages, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[PageController.listPages] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updatePage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = PageService.getInstance();

      const page = await service.updatePage(id, data);

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.updatePage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deletePage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = PageService.getInstance();

      const deleted = await service.deletePage(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Page not found');
      }

      return BaseController.ok(res, {});
    } catch (error: any) {
      logger.error('[PageController.deletePage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Publishing Workflow
  static async publishPage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const publishedBy = (req as any).user?.id || 'system';
      const service = PageService.getInstance();

      const page = await service.publishPage(id, publishedBy);

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.publishPage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async schedulePage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;

      if (!scheduledAt) {
        return BaseController.error(res, 'scheduledAt is required');
      }

      const service = PageService.getInstance();
      const page = await service.schedulePage(id, new Date(scheduledAt));

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.schedulePage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async draftPage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = PageService.getInstance();

      const page = await service.draftPage(id);

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.draftPage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archivePage(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = PageService.getInstance();

      const page = await service.archivePage(id);

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.archivePage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Version Management
  static async getVersionHistory(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = PageService.getInstance();

      const versions = await service.getVersionHistory(id);

      return BaseController.ok(res, { versions, total: versions.length });
    } catch (error: any) {
      logger.error('[PageController.getVersionHistory] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async revertToVersion(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { versionNumber } = req.body;

      if (versionNumber === undefined) {
        return BaseController.error(res, 'versionNumber is required');
      }

      const service = PageService.getInstance();
      const page = await service.revertToVersion(id, Number(versionNumber));

      return BaseController.ok(res, { page });
    } catch (error: any) {
      logger.error('[PageController.revertToVersion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Public Rendering (No Auth Required)
  static async getPublishedPage(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const service = PageService.getInstance();

      const result = await service.renderPage(slug);

      if (!result) {
        return BaseController.notFound(res, 'Page not found or not published');
      }

      return BaseController.ok(res, {
        page: result.page,
        view: result.view,
        renderData: result.renderData
      });
    } catch (error: any) {
      logger.error('[PageController.getPublishedPage] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Sitemap
  static async getPublishedPages(req: Request, res: Response): Promise<any> {
    try {
      const { siteId } = req.query;
      const service = PageService.getInstance();

      const pages = await service.getPublishedPages(siteId as string);

      return BaseController.ok(res, { pages, total: pages.length });
    } catch (error: any) {
      logger.error('[PageController.getPublishedPages] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
