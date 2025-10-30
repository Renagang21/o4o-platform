import { Request, Response } from 'express';
import SellerProductService, { 
  AddProductToSellerRequest, 
  UpdateSellerProductRequest, 
  SellerProductFilters,
  BulkAddProductsRequest 
} from '../services/SellerProductService.js';
import logger from '../utils/logger.js';

export class SellerProductController {
  private sellerProductService: SellerProductService;

  constructor() {
    this.sellerProductService = new SellerProductService();
  }

  // POST /api/seller-products - 판매자가 제품을 자신의 상점에 추가
  addProductToSeller = async (req: Request, res: Response): Promise<void> => {
    try {
      const productData: AddProductToSellerRequest = req.body;

      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Only sellers can add products to their store' });
        return;
      }

      // 판매자 ID 설정
      productData.sellerId = req.user.seller?.id;
      if (!productData.sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const sellerProduct = await this.sellerProductService.addProductToSeller(productData);
      
      res.status(201).json({
        success: true,
        data: sellerProduct
      });

    } catch (error) {
      logger.error('Error in addProductToSeller:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add product to seller store'
      });
    }
  };

  // POST /api/seller-products/bulk - 대량 제품 추가
  bulkAddProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const bulkData: Omit<BulkAddProductsRequest, 'sellerId'> = req.body;

      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Only sellers can add products to their store' });
        return;
      }

      const sellerId = req.user.seller?.id;
      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const sellerProducts = await this.sellerProductService.bulkAddProducts({
        ...bulkData,
        sellerId
      });
      
      res.status(201).json({
        success: true,
        data: sellerProducts,
        message: `${sellerProducts.length} products added successfully`
      });

    } catch (error) {
      logger.error('Error in bulkAddProducts:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk add products'
      });
    }
  };

  // PUT /api/seller-products/:id - 판매자 제품 정보 수정
  updateSellerProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateSellerProductRequest = req.body;

      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      // TODO: 해당 seller product가 요청자의 것인지 확인하는 로직 추가
      // const sellerProduct = await this.sellerProductService.getSellerProduct(id);
      // if (sellerProduct.sellerId !== req.user.seller?.id) {
      //   res.status(403).json({ error: 'Not authorized to update this product' });
      //   return;
      // }

      const sellerProduct = await this.sellerProductService.updateSellerProduct(id, updateData);
      
      res.json({
        success: true,
        data: sellerProduct
      });

    } catch (error) {
      logger.error('Error in updateSellerProduct:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update seller product'
      });
    }
  };

  // DELETE /api/seller-products/:id - 판매자 제품 제거
  removeProductFromSeller = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      // TODO: 권한 검증 로직 추가

      await this.sellerProductService.removeProductFromSeller(id);
      
      res.json({
        success: true,
        message: 'Product removed from seller store successfully'
      });

    } catch (error) {
      logger.error('Error in removeProductFromSeller:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove product from seller store'
      });
    }
  };

  // GET /api/seller-products - 판매자 제품 목록 조회
  getSellerProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: SellerProductFilters = {
        sellerId: req.query.sellerId as string,
        productId: req.query.productId as string,
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

      // 판매자가 자신의 제품만 조회하는 경우
      if (req.user?.hasRole('seller') && !req.user?.hasRole('admin')) {
        filters.sellerId = req.user.seller?.id;
      }

      const result = await this.sellerProductService.getSellerProducts(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getSellerProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seller products'
      });
    }
  };

  // GET /api/seller-products/available - 판매자가 추가 가능한 제품 목록
  getAvailableProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      const sellerId = req.user.seller?.id;
      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const filters: Partial<SellerProductFilters> = {
        supplierId: req.query.supplierId as string,
        categoryId: req.query.categoryId as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.sellerProductService.getAvailableProducts(sellerId, filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getAvailableProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available products'
      });
    }
  };

  // GET /api/seller-products/:id/profitability - 수익성 분석
  analyzeProfitability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      // TODO: 권한 검증 로직 추가

      const analysis = await this.sellerProductService.analyzeProfitability(id);
      
      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Error in analyzeProfitability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze profitability'
      });
    }
  };

  // POST /api/seller-products/sync-inventory - 재고 동기화
  syncInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      const sellerId = req.user.seller?.id;
      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const result = await this.sellerProductService.syncInventory(sellerId);
      
      res.json({
        success: true,
        data: result,
        message: `Inventory sync completed: ${result.updated} products updated, ${result.outOfStock} out of stock`
      });

    } catch (error) {
      logger.error('Error in syncInventory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync inventory'
      });
    }
  };

  // GET /api/seller-products/stats - 판매자 제품 통계
  getSellerProductStats = async (req: Request, res: Response): Promise<void> => {
    try {
      let sellerId = req.query.sellerId as string;

      // 관리자가 아닌 경우 자신의 통계만 조회
      if (!req.user?.hasRole('admin')) {
        if (!req.user?.hasRole('seller')) {
          res.status(403).json({ error: 'Seller access required' });
          return;
        }
        sellerId = req.user.seller?.id;
      }

      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const stats = await this.sellerProductService.getSellerProductStats(sellerId);
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getSellerProductStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seller product stats'
      });
    }
  };

  // GET /api/seller-products/performance - 판매자 제품 성과 분석
  getSellerProductPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      let sellerId = req.query.sellerId as string;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      // 관리자가 아닌 경우 자신의 성과만 조회
      if (!req.user?.hasRole('admin')) {
        if (!req.user?.hasRole('seller')) {
          res.status(403).json({ error: 'Seller access required' });
          return;
        }
        sellerId = req.user.seller?.id;
      }

      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const performance = await this.sellerProductService.getSellerProductPerformance(sellerId, limit);
      
      res.json({
        success: true,
        data: performance
      });

    } catch (error) {
      logger.error('Error in getSellerProductPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seller product performance'
      });
    }
  };

  // GET /api/seller-products/me - 현재 로그인한 판매자의 제품 목록
  getMyProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      const sellerId = req.user.seller?.id;
      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const filters: SellerProductFilters = {
        sellerId,
        status: req.query.status as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.sellerProductService.getSellerProducts(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getMyProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seller products'
      });
    }
  };

  // GET /api/seller-products/me/dashboard - 판매자 제품 대시보드
  getSellerProductDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('seller')) {
        res.status(403).json({ error: 'Seller access required' });
        return;
      }

      const sellerId = req.user.seller?.id;
      if (!sellerId) {
        res.status(400).json({ error: 'Seller ID not found' });
        return;
      }

      const [stats, performance] = await Promise.all([
        this.sellerProductService.getSellerProductStats(sellerId),
        this.sellerProductService.getSellerProductPerformance(sellerId, 5)
      ]);

      res.json({
        success: true,
        data: {
          stats,
          performance
        }
      });

    } catch (error) {
      logger.error('Error in getSellerProductDashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seller product dashboard'
      });
    }
  };
}

export default SellerProductController;