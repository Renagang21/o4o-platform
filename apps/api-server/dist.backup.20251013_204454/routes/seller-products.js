"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SellerProductController_1 = __importDefault(require("../controllers/SellerProductController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const sellerProductController = new SellerProductController_1.default();
// 모든 판매자 제품 관련 라우트는 인증 필요
router.use(auth_middleware_1.authenticate);
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
exports.default = router;
//# sourceMappingURL=seller-products.js.map