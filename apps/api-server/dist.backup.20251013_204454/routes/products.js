"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController_1 = __importDefault(require("../controllers/ProductController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const productController = new ProductController_1.default();
// 모든 제품 관련 라우트는 인증 필요
router.use(auth_middleware_1.authenticate);
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
exports.default = router;
//# sourceMappingURL=products.js.map