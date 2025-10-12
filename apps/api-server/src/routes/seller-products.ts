import { Router } from 'express';
import SellerProductController from '../controllers/SellerProductController';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();
const sellerProductController = new SellerProductController();

// 모든 판매자 제품 관련 라우트는 인증 필요
router.use(authenticate);

// 판매자 제품 CRUD
router.post('/', sellerProductController.addProductToSeller);
router.post('/bulk', sellerProductController.bulkAddProducts);
router.put('/:id', sellerProductController.updateSellerProduct);
router.delete('/:id', sellerProductController.removeProductFromSeller);

// 판매자 제품 조회
router.get('/', sellerProductController.getSellerProducts);
router.get('/available', sellerProductController.getAvailableProducts);

// 분석 및 관리 기능
router.get('/:id/profitability', sellerProductController.analyzeProfitability);
router.post('/sync-inventory', sellerProductController.syncInventory);

// 통계 및 성과
router.get('/stats', sellerProductController.getSellerProductStats);
router.get('/performance', sellerProductController.getSellerProductPerformance);

// 개인 판매자 정보
router.get('/me', sellerProductController.getMyProducts);
router.get('/me/dashboard', sellerProductController.getSellerProductDashboard);

export default router;