import { Router, type IRouter } from 'express';
import {
  ProductController,
  CategoryController,
  CartController,
  OrderController,
  PaymentController,
  ShipmentController,
} from '../controllers/index.js';
import {
  validateDto,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  requireAdmin,
} from '../../../common/middleware/auth.middleware.js';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AddToCartDto,
  UpdateCartItemDto,
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  CreatePaymentDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  CheckoutDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

/**
 * Unified Commerce Routes - NextGen V2 Pattern
 *
 * This router consolidates all commerce-related endpoints:
 * - Product management (ProductController)
 * - Category management (CategoryController)
 * - Shopping cart (CartController)
 * - Order processing (OrderController)
 * - Payment processing (PaymentController)
 * - Shipping & tracking (ShipmentController)
 *
 * Replaces legacy routes:
 * - /api/products
 * - /api/cart
 * - /api/orders
 * - /api/payments
 * - /api/shipments
 */
const router: IRouter = Router();

/**
 * ========================================
 * PRODUCT ROUTES (ProductController)
 * ========================================
 */

// POST /api/v1/commerce/products - Create product (Admin/Supplier)
router.post(
  '/products',
  requireAuth,
  validateDto(CreateProductDto),
  asyncHandler(ProductController.createProduct)
);

// GET /api/v1/commerce/products - List products (Public)
router.get(
  '/products',
  asyncHandler(ProductController.listProducts)
);

// GET /api/v1/commerce/products/:id - Get product by ID (Public)
router.get(
  '/products/:id',
  asyncHandler(ProductController.getProduct)
);

// PUT /api/v1/commerce/products/:id - Update product (Admin/Supplier)
router.put(
  '/products/:id',
  requireAuth,
  validateDto(UpdateProductDto),
  asyncHandler(ProductController.updateProduct)
);

// DELETE /api/v1/commerce/products/:id - Delete product (Admin)
router.delete(
  '/products/:id',
  requireAdmin,
  asyncHandler(ProductController.deleteProduct)
);

/**
 * ========================================
 * CATEGORY ROUTES (CategoryController)
 * ========================================
 */

// POST /api/v1/commerce/categories - Create category (Admin)
router.post(
  '/categories',
  requireAdmin,
  validateDto(CreateCategoryDto),
  asyncHandler(CategoryController.createCategory)
);

// GET /api/v1/commerce/categories - List categories (Public)
router.get(
  '/categories',
  asyncHandler(CategoryController.listCategories)
);

// GET /api/v1/commerce/categories/:id - Get category by ID (Public)
router.get(
  '/categories/:id',
  asyncHandler(CategoryController.getCategory)
);

// PUT /api/v1/commerce/categories/:id - Update category (Admin)
router.put(
  '/categories/:id',
  requireAdmin,
  validateDto(UpdateCategoryDto),
  asyncHandler(CategoryController.updateCategory)
);

// DELETE /api/v1/commerce/categories/:id - Delete category (Admin)
router.delete(
  '/categories/:id',
  requireAdmin,
  asyncHandler(CategoryController.deleteCategory)
);

/**
 * ========================================
 * CART ROUTES (CartController)
 * ========================================
 */

// GET /api/v1/commerce/cart - Get current user's cart
router.get(
  '/cart',
  requireAuth,
  asyncHandler(CartController.getCart)
);

// POST /api/v1/commerce/cart/items - Add item to cart
router.post(
  '/cart/items',
  requireAuth,
  validateDto(AddToCartDto),
  asyncHandler(CartController.addToCart)
);

// PUT /api/v1/commerce/cart/items/:itemId - Update cart item quantity
router.put(
  '/cart/items/:itemId',
  requireAuth,
  validateDto(UpdateCartItemDto),
  asyncHandler(CartController.updateCartItem)
);

// DELETE /api/v1/commerce/cart/items/:itemId - Remove item from cart
router.delete(
  '/cart/items/:itemId',
  requireAuth,
  asyncHandler(CartController.removeCartItem)
);

// DELETE /api/v1/commerce/cart - Clear entire cart
router.delete(
  '/cart',
  requireAuth,
  asyncHandler(CartController.clearCart)
);

/**
 * ========================================
 * ORDER ROUTES (OrderController)
 * ========================================
 */

// POST /api/v1/commerce/orders - Create order (Checkout)
router.post(
  '/orders',
  requireAuth,
  validateDto(CreateOrderDto),
  asyncHandler(OrderController.createOrder)
);

// GET /api/v1/commerce/orders - List user's orders
router.get(
  '/orders',
  requireAuth,
  asyncHandler(OrderController.listOrders)
);

// GET /api/v1/commerce/orders/:id - Get order by ID
router.get(
  '/orders/:id',
  requireAuth,
  asyncHandler(OrderController.getOrder)
);

// PUT /api/v1/commerce/orders/:id/status - Update order status (Admin)
router.put(
  '/orders/:id/status',
  requireAdmin,
  validateDto(UpdateOrderDto),
  asyncHandler(OrderController.updateOrderStatus)
);

// POST /api/v1/commerce/orders/:id/cancel - Cancel order
router.post(
  '/orders/:id/cancel',
  requireAuth,
  asyncHandler(OrderController.cancelOrder)
);

/**
 * ========================================
 * PAYMENT ROUTES (PaymentController)
 * ========================================
 */

// POST /api/v1/commerce/payments - Create payment
router.post(
  '/payments',
  requireAuth,
  validateDto(CreatePaymentDto),
  asyncHandler(PaymentController.createPayment)
);

// GET /api/v1/commerce/payments/:id - Get payment by ID
router.get(
  '/payments/:id',
  requireAuth,
  asyncHandler(PaymentController.getPayment)
);

// POST /api/v1/commerce/payments/:id/confirm - Confirm payment (Toss callback)
router.post(
  '/payments/:id/confirm',
  asyncHandler(PaymentController.confirmPayment)
);

// POST /api/v1/commerce/payments/:id/cancel - Cancel payment
router.post(
  '/payments/:id/cancel',
  requireAuth,
  asyncHandler(PaymentController.cancelPayment)
);

// GET /api/v1/commerce/payments/order/:orderId - Get payments for order
router.get(
  '/payments/order/:orderId',
  requireAuth,
  asyncHandler(PaymentController.getPaymentsByOrder)
);

/**
 * ========================================
 * SHIPMENT ROUTES (ShipmentController)
 * ========================================
 */

// POST /api/v1/commerce/shipments - Create shipment (Admin)
router.post(
  '/shipments',
  requireAdmin,
  validateDto(CreateShipmentDto),
  asyncHandler(ShipmentController.createShipment)
);

// GET /api/v1/commerce/shipments/:id - Get shipment by ID
router.get(
  '/shipments/:id',
  requireAuth,
  asyncHandler(ShipmentController.getShipment)
);

// PUT /api/v1/commerce/shipments/:id - Update shipment status (Admin)
router.put(
  '/shipments/:id',
  requireAdmin,
  validateDto(UpdateShipmentDto),
  asyncHandler(ShipmentController.updateShipment)
);

// GET /api/v1/commerce/shipments/:id/tracking - Get tracking history
router.get(
  '/shipments/:id/tracking',
  requireAuth,
  asyncHandler(ShipmentController.getTrackingHistory)
);

// GET /api/v1/commerce/shipments/order/:orderId - Get shipments for order
router.get(
  '/shipments/order/:orderId',
  requireAuth,
  asyncHandler(ShipmentController.getShipmentsByOrder)
);

export default router;
