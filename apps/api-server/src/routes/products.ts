import { Router } from 'express';
import ProductController from '../controllers/ProductController';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();
const productController = new ProductController();

// 모든 제품 관련 라우트는 인증 필요
router.use(authenticate);

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