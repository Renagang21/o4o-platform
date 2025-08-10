import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ProductsController } from '../controllers/productsController';
import { CartController } from '../controllers/cartController';
import { OrdersController } from '../controllers/ordersController';

const router: Router = Router();

// 컨트롤러 인스턴스 생성
const productsController = new ProductsController();
const cartController = new CartController();
const ordersController = new OrdersController();

// 상품 라우트 (일부는 인증 불필요)
router.get('/products', productsController.getProducts);
router.get('/products/featured', productsController.getFeaturedProducts);
router.get('/products/:id', productsController.getProduct);

// 상품 관리 라우트 (관리자만)
router.post('/products', authenticateToken, productsController.createProduct);
router.put('/products/:id', authenticateToken, productsController.updateProduct);
router.delete('/products/:id', authenticateToken, productsController.deleteProduct);

// 장바구니 라우트 (인증 필요)
router.use('/cart', authenticateToken);
router.get('/cart', cartController.getCart);
router.post('/cart/items', cartController.addToCart);
router.put('/cart/items/:itemId', cartController.updateCartItem);
router.delete('/cart/items/:itemId', cartController.removeCartItem);
router.delete('/cart', cartController.clearCart);
router.post('/cart/coupon', cartController.applyCoupon);
router.delete('/cart/coupon', cartController.removeCoupon);

// 주문 라우트 (인증 필요)
router.use('/orders', authenticateToken);
router.get('/orders', ordersController.getOrders);
router.get('/orders/:id', ordersController.getOrder);
router.post('/orders', ordersController.createOrder);
router.patch('/orders/:id/cancel', ordersController.cancelOrder);

export default router;
