import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { AuthRequest } from '../middleware/auth';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // GET /products - List products
  async getProducts(req: Request, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'active',
      featured
    } = req.query;

    try {
      const { products, total } = await this.productService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined
      });

      res.json({
        success: true,
        data: products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      // Return empty data for database issues (graceful degradation)
      res.json({
        success: true,
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0
        }
      });
    }
  }

  // GET /products/featured - Get featured products
  async getFeaturedProducts(req: Request, res: Response): Promise<void> {
    try {
      const { products } = await this.productService.findAll({ featured: true });

      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      // Return empty data for database issues (graceful degradation)
      res.json({
        success: true,
        data: []
      });
    }
  }

  // GET /products/:id - Get single product
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Try to find by ID first, then by slug
      let product = await this.productService.findById(id);
      
      if (!product) {
        // Try to find by slug
        const { products } = await this.productService.findAll({ search: id, limit: 1 });
        product = products.find(p => p.slug === id) || null;
      }

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        message: error.message
      });
    }
  }

  // POST /products - Create product
  async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const product = await this.productService.createProduct(req.body, userId);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to create product',
        message: error.message
      });
    }
  }

  // PUT /products/:id - Update product
  async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await this.productService.updateProduct(id, req.body);

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });
    } catch (error: any) {
      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: 'Product not found'
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Failed to update product',
        message: error.message
      });
    }
  }

  // DELETE /products/:id - Delete product
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error: any) {
      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: 'Product not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        message: error.message
      });
    }
  }

  // POST /products/import - Import products from CSV
  async importProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const { products } = req.body;
      if (!Array.isArray(products)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request: products array is required'
        });
        return;
      }

      const result = await this.productService.importProducts(products, userId);

      res.json({
        success: true,
        data: result,
        message: `Import completed: ${result.created} created, ${result.failed} failed`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to import products',
        message: error.message
      });
    }
  }
}