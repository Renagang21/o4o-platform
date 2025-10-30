import { Request, Response } from 'express';
import ProductService, { CreateProductRequest, UpdateProductRequest, ProductFilters } from '../services/ProductService.js';
import logger from '../utils/logger.js';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // POST /api/products - 제품 생성 (공급자용)
  createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productData: CreateProductRequest = req.body;
      
      // 요청자가 공급자인지 확인
      if (!req.user?.hasRole('supplier')) {
        res.status(403).json({ error: 'Only suppliers can create products' });
        return;
      }

      // 공급자 ID 설정
      productData.supplierId = req.user.supplier?.id;
      if (!productData.supplierId) {
        res.status(400).json({ error: 'Supplier ID not found' });
        return;
      }

      const product = await this.productService.createProduct(productData);
      
      res.status(201).json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error in createProduct:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product'
      });
    }
  };

  // GET /api/products/:id - 제품 조회
  getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const product = await this.productService.getProduct(id);
      
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error in getProduct:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product'
      });
    }
  };

  // GET /api/products - 제품 목록 조회
  getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: ProductFilters = {
        supplierId: req.query.supplierId as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.productService.getProducts(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products'
      });
    }
  };

  // PUT /api/products/:id - 제품 수정
  updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateProductRequest = req.body;
      
      // 요청자가 해당 제품의 공급자인지 확인
      const existingProduct = await this.productService.getProduct(id);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (!req.user?.hasRole('supplier') || existingProduct.supplierId !== req.user.supplier?.id) {
        res.status(403).json({ error: 'Not authorized to update this product' });
        return;
      }

      const product = await this.productService.updateProduct(id, updateData);
      
      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error in updateProduct:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product'
      });
    }
  };

  // DELETE /api/products/:id - 제품 삭제 (소프트 삭제)
  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 요청자가 해당 제품의 공급자인지 확인
      const existingProduct = await this.productService.getProduct(id);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (!req.user?.hasRole('supplier') || existingProduct.supplierId !== req.user.supplier?.id) {
        res.status(403).json({ error: 'Not authorized to delete this product' });
        return;
      }

      await this.productService.deleteProduct(id);
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      logger.error('Error in deleteProduct:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product'
      });
    }
  };

  // PATCH /api/products/:id/status - 제품 활성화/비활성화
  toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive must be a boolean' });
        return;
      }

      // 요청자가 해당 제품의 공급자인지 확인
      const existingProduct = await this.productService.getProduct(id);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (!req.user?.hasRole('supplier') || existingProduct.supplierId !== req.user.supplier?.id) {
        res.status(403).json({ error: 'Not authorized to modify this product' });
        return;
      }

      const product = await this.productService.toggleProductStatus(id, isActive);
      
      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error in toggleProductStatus:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle product status'
      });
    }
  };

  // PATCH /api/products/:id/inventory - 재고 업데이트
  updateInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body;
      
      if (typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({ error: 'Invalid quantity' });
        return;
      }

      if (!['add', 'subtract', 'set'].includes(operation)) {
        res.status(400).json({ error: 'Invalid operation. Must be add, subtract, or set' });
        return;
      }

      // 요청자가 해당 제품의 공급자인지 확인
      const existingProduct = await this.productService.getProduct(id);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (!req.user?.hasRole('supplier') || existingProduct.supplierId !== req.user.supplier?.id) {
        res.status(403).json({ error: 'Not authorized to modify this product' });
        return;
      }

      const product = await this.productService.updateInventory(id, quantity, operation);
      
      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error in updateInventory:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update inventory'
      });
    }
  };

  // GET /api/products/available-for-sellers - 판매자가 선택 가능한 제품 목록
  getAvailableProductsForSellers = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: Omit<ProductFilters, 'status'> = {
        supplierId: req.query.supplierId as string,
        categoryId: req.query.categoryId as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.productService.getAvailableProductsForSellers(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getAvailableProductsForSellers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available products'
      });
    }
  };

  // GET /api/products/supplier/:supplierId/stats - 공급자별 제품 통계
  getSupplierProductStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { supplierId } = req.params;

      // 요청자가 해당 공급자이거나 관리자인지 확인
      if (!req.user?.hasRole('admin') &&
          (!req.user?.hasRole('supplier') || req.user.supplier?.id !== supplierId)) {
        res.status(403).json({ error: 'Not authorized to view these stats' });
        return;
      }

      const stats = await this.productService.getSupplierProductStats(supplierId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getSupplierProductStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier product stats'
      });
    }
  };

  // POST /api/products/bulk-import - CSV 일괄 가져오기
  bulkImportProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { products } = req.body;

      // 요청자가 공급자인지 확인
      if (!req.user?.hasRole('supplier')) {
        res.status(403).json({ error: 'Only suppliers can import products' });
        return;
      }

      const supplierId = req.user.supplier?.id;
      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID not found' });
        return;
      }

      // 입력 검증
      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({ error: 'Products array is required and must not be empty' });
        return;
      }

      if (products.length > 1000) {
        res.status(400).json({ error: 'Maximum 1000 products per import' });
        return;
      }

      // 각 제품에 supplierId 할당
      const productsWithSupplier = products.map(p => ({
        ...p,
        supplierId
      }));

      const result = await this.productService.bulkImportProducts(productsWithSupplier);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in bulkImportProducts:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import products'
      });
    }
  };
}

export default ProductController;