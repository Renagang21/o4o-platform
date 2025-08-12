"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const vendorStatsController_1 = require("../controllers/vendor/vendorStatsController");
const vendorProductController_1 = require("../controllers/vendor/vendorProductController");
const vendorOrderController_1 = require("../controllers/vendor/vendorOrderController");
const router = (0, express_1.Router)();
// Controllers
const vendorStatsController = new vendorStatsController_1.VendorStatsController();
const vendorProductController = new vendorProductController_1.VendorProductController();
const vendorOrderController = new vendorOrderController_1.VendorOrderController();
// 모든 벤더 라우트는 인증 필요 + 벤더 권한 체크
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['seller', 'supplier']));
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
    var _a, _b, _c, _d, _e, _f, _g;
    // 현재는 인증된 사용자 정보 반환
    res.json({
        id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        name: (_b = req.user) === null || _b === void 0 ? void 0 : _b.name,
        email: (_c = req.user) === null || _c === void 0 ? void 0 : _c.email,
        businessName: ((_e = (_d = req.user) === null || _d === void 0 ? void 0 : _d.businessInfo) === null || _e === void 0 ? void 0 : _e.companyName) || ((_f = req.user) === null || _f === void 0 ? void 0 : _f.name),
        role: (_g = req.user) === null || _g === void 0 ? void 0 : _g.role
    });
});
router.put('/profile', (req, res) => {
    // TODO: 프로필 업데이트 구현
    res.json({ message: 'Profile update endpoint - to be implemented' });
});
// 설정 관리 (TODO)
router.get('/settings', (req, res) => {
    var _a, _b, _c;
    // TODO: 벤더 설정 조회
    res.json({
        storeName: ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.businessInfo) === null || _b === void 0 ? void 0 : _b.companyName) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'My Store',
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
exports.default = router;
//# sourceMappingURL=vendor.js.map