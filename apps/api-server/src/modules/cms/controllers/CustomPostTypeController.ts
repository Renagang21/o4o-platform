import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CustomPostTypeService } from '../services/CustomPostTypeService.js';
import logger from '../../../utils/logger.js';

/**
 * CustomPostTypeController
 * NextGen V2 - CMS Module
 * Handles CustomPostType CRUD operations
 */
export class CustomPostTypeController extends BaseController {
  static async createCPT(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.createCPT(data);

      return BaseController.created(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.createCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.getCPT(id);

      if (!cpt) {
        return BaseController.notFound(res, 'Custom Post Type not found');
      }

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.getCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCPTBySlug(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.getCPTBySlug(slug);

      if (!cpt) {
        return BaseController.notFound(res, 'Custom Post Type not found');
      }

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.getCPTBySlug] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCPTs(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = CustomPostTypeService.getInstance();

      const { cpts, total } = await service.listCPTs(filters as any);

      return BaseController.okPaginated(res, cpts, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.listCPTs] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.updateCPT(id, data);

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.updateCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const deleted = await service.deleteCPT(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Custom Post Type not found');
      }

      return BaseController.ok(res, {});
    } catch (error: any) {
      logger.error('[CustomPostTypeController.deleteCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async activateCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.activateCPT(id);

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.activateCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.archiveCPT(id);

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.archiveCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
