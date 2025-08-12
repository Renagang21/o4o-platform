"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const productsController_1 = require("../controllers/productsController");
const cartController_1 = require("../controllers/cartController");
const ordersController_1 = require("../controllers/ordersController");
const router = (0, express_1.Router)();
// 컨트롤러 인스턴스 생성
const productsController = new productsController_1.ProductsController();
const cartController = new cartController_1.CartController();
const ordersController = new ordersController_1.OrdersController();
// 상품 라우트 (일부는 인증 불필요)
router.get('/products', productsController.getProducts);
router.get('/products/featured', productsController.getFeaturedProducts);
router.get('/products/:id', productsController.getProduct);
// 상품 관리 라우트 (관리자만)
router.post('/products', auth_1.authenticateToken, productsController.createProduct);
router.put('/products/:id', auth_1.authenticateToken, productsController.updateProduct);
router.delete('/products/:id', auth_1.authenticateToken, productsController.deleteProduct);
// 장바구니 라우트 (인증 필요)
router.use('/cart', auth_1.authenticateToken);
router.get('/cart', cartController.getCart);
router.post('/cart/items', cartController.addToCart);
router.put('/cart/items/:itemId', cartController.updateCartItem);
router.delete('/cart/items/:itemId', cartController.removeCartItem);
router.delete('/cart', cartController.clearCart);
router.post('/cart/coupon', cartController.applyCoupon);
router.delete('/cart/coupon', cartController.removeCoupon);
// 주문 라우트 (인증 필요)
router.use('/orders', auth_1.authenticateToken);
router.get('/orders', ordersController.getOrders);
router.get('/orders/:id', ordersController.getOrder);
router.post('/orders', ordersController.createOrder);
router.patch('/orders/:id/cancel', ordersController.cancelOrder);
exports.default = router;
//# sourceMappingURL=ecommerce.js.map