import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ProductService } from '../services/ProductService.js';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * ProductController
 * NextGen V2 - Commerce Module
 * Handles product CRUD operations
 */
export class ProductController extends BaseController {
  static async createProduct(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body as CreateProductDto;
      const productService = ProductService.getInstance();

      const product = await productService.create(data);

      return BaseController.ok(res, { product });
    } catch (error: any) {
      logger.error('[ProductController.createProduct] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async getProduct(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const productService = ProductService.getInstance();

      const product = await productService.findById(id);

      if (!product) {
        return BaseController.notFound(res, 'Product not found');
      }

      return BaseController.ok(res, { product });
    } catch (error: any) {
      logger.error('[ProductController.getProduct] Error', {
        error: error.message,
        productId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listProducts(req: Request, res: Response): Promise<any> {
    try {
      const query = req.query as unknown as ProductQueryDto;
      const productService = ProductService.getInstance();

      const page = query.page || 1;
      const limit = query.limit || 20;

      // This is a simplified implementation
      // Real implementation would use the service's advanced query methods
      const products = await productService.findAll({
        page,
        limit,
      });

      return BaseController.okPaginated(res, products, {
        page,
        limit,
        total: products.length,
        totalPages: Math.ceil(products.length / limit),
      });
    } catch (error: any) {
      logger.error('[ProductController.listProducts] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateProduct(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body as UpdateProductDto;
      const productService = ProductService.getInstance();

      const product = await productService.update(id, data);

      return BaseController.ok(res, { product });
    } catch (error: any) {
      logger.error('[ProductController.updateProduct] Error', {
        error: error.message,
        productId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const productService = ProductService.getInstance();

      await productService.delete(id);

      return BaseController.ok(res, { message: 'Product deleted successfully' });
    } catch (error: any) {
      logger.error('[ProductController.deleteProduct] Error', {
        error: error.message,
        productId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }
}
