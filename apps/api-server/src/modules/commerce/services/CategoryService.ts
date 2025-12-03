import { Category } from '../entities/Category.js';
import { BaseService } from '../../../common/base.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * CategoryService
 * NextGen V2 - BaseService pattern
 * Handles category operations
 */
export class CategoryService extends BaseService<Category> {
  private static instance: CategoryService;

  constructor() {
    super(Category);
  }

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      return await this.repo.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error: any) {
      logger.error('[CategoryService.getAllCategories] Error', {
        error: error.message,
      });
      throw new Error('Failed to get categories');
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      return await this.repo.findOne({
        where: { slug, isActive: true },
      });
    } catch (error: any) {
      logger.error('[CategoryService.getCategoryBySlug] Error', {
        error: error.message,
        slug,
      });
      throw new Error('Failed to get category');
    }
  }

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    sortOrder?: number;
    metaTitle?: string;
    metaDescription?: string;
  }): Promise<Category> {
    try {
      const category = this.repo.create(data);
      return await this.repo.save(category);
    } catch (error: any) {
      logger.error('[CategoryService.createCategory] Error', {
        error: error.message,
        data,
      });
      throw new Error('Failed to create category');
    }
  }

  async updateCategory(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      image: string;
      sortOrder: number;
      isActive: boolean;
      metaTitle: string;
      metaDescription: string;
    }>
  ): Promise<Category> {
    try {
      const category = await this.repo.findOne({ where: { id } });
      if (!category) {
        throw new Error('Category not found');
      }

      Object.assign(category, data);
      return await this.repo.save(category);
    } catch (error: any) {
      logger.error('[CategoryService.updateCategory] Error', {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const category = await this.repo.findOne({ where: { id } });
      if (!category) {
        throw new Error('Category not found');
      }

      category.isActive = false;
      await this.repo.save(category);
    } catch (error: any) {
      logger.error('[CategoryService.deleteCategory] Error', {
        error: error.message,
        id,
      });
      throw error;
    }
  }
}
