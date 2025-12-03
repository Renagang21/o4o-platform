import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CategoryService } from '../services/CategoryService.js';
import { logger } from '../../../utils/logger.js';

/**
 * CategoryController
 * NextGen V2 - Commerce Module
 * Handles category CRUD operations
 */
export class CategoryController extends BaseController {
  static async listCategories(req: Request, res: Response): Promise<any> {
    try {
      const categoryService = CategoryService.getInstance();
      const categories = await categoryService.getAllCategories();

      return BaseController.ok(res, { categories });
    } catch (error: any) {
      logger.error('[CategoryController.listCategories] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async getCategory(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const categoryService = CategoryService.getInstance();

      const category = await categoryService.findById(id);

      if (!category) {
        return BaseController.notFound(res, 'Category not found');
      }

      return BaseController.ok(res, { category });
    } catch (error: any) {
      logger.error('[CategoryController.getCategory] Error', {
        error: error.message,
        categoryId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getCategoryBySlug(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const categoryService = CategoryService.getInstance();

      const category = await categoryService.getCategoryBySlug(slug);

      if (!category) {
        return BaseController.notFound(res, 'Category not found');
      }

      return BaseController.ok(res, { category });
    } catch (error: any) {
      logger.error('[CategoryController.getCategoryBySlug] Error', {
        error: error.message,
        slug: req.params.slug,
      });
      return BaseController.error(res, error);
    }
  }

  static async createCategory(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const categoryService = CategoryService.getInstance();

      const category = await categoryService.createCategory(data);

      return BaseController.ok(res, { category });
    } catch (error: any) {
      logger.error('[CategoryController.createCategory] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const categoryService = CategoryService.getInstance();

      const category = await categoryService.updateCategory(id, data);

      return BaseController.ok(res, { category });
    } catch (error: any) {
      logger.error('[CategoryController.updateCategory] Error', {
        error: error.message,
        categoryId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const categoryService = CategoryService.getInstance();

      await categoryService.deleteCategory(id);

      return BaseController.ok(res, { message: 'Category deleted successfully' });
    } catch (error: any) {
      logger.error('[CategoryController.deleteCategory] Error', {
        error: error.message,
        categoryId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }
}
