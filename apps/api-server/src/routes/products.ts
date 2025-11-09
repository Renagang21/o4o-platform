import { Router } from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();
const productController = new ProductController();

// 모든 제품 관련 라우트는 인증 필요
router.use(authenticate);

/**
 * GET /api/products/low-stock
 * Get low stock alert count and samples for dashboard widget
 *
 * @query threshold - Stock quantity threshold (default: 10)
 * @query limit - Number of sample products to return (default: 1, 0 for count only)
 */
router.get('/low-stock', async (req, res) => {
  try {
    const { AppDataSource } = await import('../database/connection.js');
    const { Product } = await import('../entities/Product.js');
    const { LessThan } = await import('typeorm');

    const threshold = parseInt(req.query.threshold as string) || 10;
    const limit = parseInt(req.query.limit as string) || 1;

    const productRepo = AppDataSource.getRepository(Product);

    // Count low stock products
    const count = await productRepo.count({
      where: {
        stockQuantity: LessThan(threshold) as any
      }
    });

    let sample = [];
    if (limit > 0) {
      sample = await productRepo.find({
        where: {
          stockQuantity: LessThan(threshold) as any
        },
        take: limit,
        order: {
          stockQuantity: 'ASC'
        },
        select: ['id', 'sku', 'name', 'stockQuantity']
      });
    }

    res.json({ count, sample });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch low stock products'
    });
  }
});

// 제품 CRUD
router.post('/', productController.createProduct);
router.get('/:id', productController.getProduct);
router.get('/', productController.getProducts);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// 제품 관리
router.patch('/:id/status', productController.toggleProductStatus);
router.patch('/:id/inventory', productController.updateInventory);

// 공급자 통계
router.get('/supplier/:supplierId/stats', productController.getSupplierProductStats);

// 판매자용 제품 조회 (라우트 순서 조정)
router.get('/available-for-sellers', productController.getAvailableProductsForSellers);

export default router;