import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { VendorStatsController } from '../controllers/vendor/vendorStatsController';
import { VendorProductController } from '../controllers/vendor/vendorProductController';
import { VendorOrderController } from '../controllers/vendor/vendorOrderController';

const router = Router();

// Controllers
const vendorStatsController = new VendorStatsController();
const vendorProductController = new VendorProductController();
const vendorOrderController = new VendorOrderController();

// 모든 벤더 라우트는 인증 필요 + 벤더 권한 체크
router.use(authMiddleware);
router.use(roleMiddleware(['business', 'supplier']));

// 통계 관련
router.get('/stats/dashboard', vendorStatsController.getDashboardStats);
router.get('/stats/sales-chart', vendorStatsController.getSalesChartData);
router.get('/stats/recent-orders', vendorStatsController.getRecentOrders);
router.get('/stats/top-products', vendorStatsController.getTopProducts);

// 상품 관리
router.get('/products', vendorProductController.getProducts);
router.get('/products/categories', vendorProductController.getCategories);
router.get('/products/:id', vendorProductController.getProduct);
router.post('/products', vendorProductController.createProduct);
router.put('/products/:id', vendorProductController.updateProduct);
router.delete('/products/:id', vendorProductController.deleteProduct);

// 주문 관리
router.get('/orders', vendorOrderController.getOrders);
router.get('/orders/stats', vendorOrderController.getOrderStats);
router.get('/orders/:id', vendorOrderController.getOrder);
router.put('/orders/:id/status', vendorOrderController.updateOrderStatus);
router.post('/orders/bulk-update', vendorOrderController.bulkUpdateOrderStatus);

// 프로필 관리 (TODO)
router.get('/profile', (req, res) => {
  // 현재는 인증된 사용자 정보 반환
  res.json({
    id: req.user?.id,
    name: req.user?.name,
    email: req.user?.email,
    businessName: req.user?.business_name,
    role: req.user?.role
  });
});

router.put('/profile', (req, res) => {
  // TODO: 프로필 업데이트 구현
  res.json({ message: 'Profile update endpoint - to be implemented' });
});

// 설정 관리 (TODO)
router.get('/settings', (req, res) => {
  // TODO: 벤더 설정 조회
  res.json({
    storeName: req.user?.business_name || 'My Store',
    storeDescription: '',
    shippingFee: 3000,
    freeShippingThreshold: 50000,
    returnPeriod: 7
  });
});

router.put('/settings', (req, res) => {
  // TODO: 벤더 설정 업데이트
  res.json({ message: 'Settings update endpoint - to be implemented' });
});

export default router;