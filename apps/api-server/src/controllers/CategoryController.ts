import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Category } from '../entities/Category.js';
import logger from '../utils/logger.js';

export class CategoryController {
  // GET /api/categories - Get all categories with product count
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categoryRepo = AppDataSource.getTreeRepository(Category);

      // Get all categories with tree structure
      const categories = await categoryRepo.findTrees();

      // Get product counts for each category
      const categoriesWithCount = await Promise.all(
        this.flattenCategories(categories).map(async (category) => {
          const productCount = await AppDataSource.query(
            `SELECT COUNT(*) as count FROM products WHERE "categoryId" = $1 AND "isActive" = true`,
            [category.id]
          );

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
            count: parseInt(productCount[0]?.count || '0'),
            parent: category.parent,
            children: category.children
          };
        })
      );

      res.json({
        success: true,
        data: categoriesWithCount
      });
    } catch (error) {
      logger.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  }

  // Helper to flatten tree structure
  private flattenCategories(categories: Category[]): Category[] {
    const result: Category[] = [];

    const flatten = (cats: Category[]) => {
      for (const cat of cats) {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children);
        }
      }
    };

    flatten(categories);
    return result;
  }
}

export default CategoryController;
