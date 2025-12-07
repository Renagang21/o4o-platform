import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ViewService } from '../services/ViewService.js';
import logger from '../../../utils/logger.js';

/**
 * ViewController
 * NextGen V2 - CMS Module
 * Handles View template CRUD operations
 */
export class ViewController extends BaseController {
  static async createView(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = ViewService.getInstance();

      const view = await service.createView(data);

      return BaseController.created(res, view);
    } catch (error: any) {
      logger.error('[ViewController.createView] Error', { error: error.message });

      // Handle duplicate slug error
      if (error.message && error.message.includes('already exists')) {
        return BaseController.error(res, error.message, 409);
      }

      // Handle validation errors
      if (error.message && error.message.includes('Invalid View schema')) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  static async getView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ViewService.getInstance();

      const view = await service.getView(id);

      if (!view) {
        return BaseController.notFound(res, 'View not found');
      }

      return BaseController.ok(res, view);
    } catch (error: any) {
      logger.error('[ViewController.getView] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getViewBySlug(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const service = ViewService.getInstance();

      const view = await service.getViewBySlug(slug);

      if (!view) {
        return BaseController.notFound(res, 'View not found');
      }

      return BaseController.ok(res, view);
    } catch (error: any) {
      logger.error('[ViewController.getViewBySlug] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listViews(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = ViewService.getInstance();

      const { views, total } = await service.listViews(filters as any);

      return BaseController.okPaginated(res, views, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[ViewController.listViews] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = ViewService.getInstance();

      const view = await service.updateView(id, data);

      return BaseController.ok(res, view);
    } catch (error: any) {
      logger.error('[ViewController.updateView] Error', { error: error.message });

      // Handle not found error
      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      // Handle duplicate slug error
      if (error.message && error.message.includes('already exists')) {
        return BaseController.error(res, error.message, 409);
      }

      // Handle validation errors
      if (error.message && error.message.includes('Invalid View schema')) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ViewService.getInstance();

      const deleted = await service.deleteView(id);

      if (!deleted) {
        return BaseController.notFound(res, 'View not found');
      }

      return BaseController.ok(res, {});
    } catch (error: any) {
      logger.error('[ViewController.deleteView] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async activateView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ViewService.getInstance();

      const view = await service.activateView(id);

      return BaseController.ok(res, view);
    } catch (error: any) {
      logger.error('[ViewController.activateView] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ViewService.getInstance();

      const view = await service.archiveView(id);

      return BaseController.ok(res, view);
    } catch (error: any) {
      logger.error('[ViewController.archiveView] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async cloneView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { slug, name } = req.body;

      if (!slug) {
        return BaseController.error(res, 'slug is required', 400);
      }

      const service = ViewService.getInstance();
      const clonedView = await service.cloneView(id, slug, name);

      return BaseController.created(res, clonedView);
    } catch (error: any) {
      logger.error('[ViewController.cloneView] Error', { error: error.message });

      // Handle not found error
      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      // Handle duplicate slug error
      if (error.message && error.message.includes('already exists')) {
        return BaseController.error(res, error.message, 409);
      }

      return BaseController.error(res, error);
    }
  }

  static async getComponentsInView(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ViewService.getInstance();

      const components = await service.getComponentsInView(id);

      return BaseController.ok(res, components);
    } catch (error: any) {
      logger.error('[ViewController.getComponentsInView] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getViewsForCPT(req: Request, res: Response): Promise<any> {
    try {
      const { postTypeSlug } = req.params;
      const service = ViewService.getInstance();

      const views = await service.getViewsForCPT(postTypeSlug);

      return BaseController.ok(res, views);
    } catch (error: any) {
      logger.error('[ViewController.getViewsForCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
