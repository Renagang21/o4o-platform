"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productVariationController_1 = require("../../controllers/productVariationController");
const auth_1 = require("../../middleware/auth");
const requireRole_1 = require("../../middleware/requireRole");
const router = (0, express_1.Router)();
const controller = new productVariationController_1.ProductVariationController();
// 상품 속성 관리
router.post('/products/:productId/attributes', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'vendor']), controller.addProductAttribute);
// 상품 변형 생성
router.post('/products/:productId/variations', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'vendor']), controller.createProductVariation);
// 변형 자동 생성
router.post('/products/:productId/variations/generate', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'vendor']), controller.generateVariations);
// 상품 변형 목록 조회
router.get('/products/:productId/variations', controller.getProductVariations);
// 변형 재고 업데이트
router.patch('/variations/:variationId/stock', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'vendor']), controller.updateVariationStock);
// 변형 가격 일괄 업데이트
router.patch('/products/:productId/variations/prices', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'vendor']), controller.bulkUpdateVariationPrices);
exports.default = router;
//# sourceMappingURL=product-variation.routes.js.map