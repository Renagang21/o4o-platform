"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const OrderController_1 = require("../controllers/OrderController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_handler_1 = require("../middleware/error-handler");
const router = (0, express_1.Router)();
const orderController = new OrderController_1.OrderController();
// Validation middleware
const validateCreateOrder = [
    (0, express_validator_1.body)('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
    (0, express_validator_1.body)('items.*.productId').isUUID().withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    (0, express_validator_1.body)('billingAddress.recipientName').notEmpty().withMessage('Billing recipient name is required'),
    (0, express_validator_1.body)('billingAddress.phone').notEmpty().withMessage('Billing phone is required'),
    (0, express_validator_1.body)('billingAddress.zipCode').notEmpty().withMessage('Billing zip code is required'),
    (0, express_validator_1.body)('billingAddress.address').notEmpty().withMessage('Billing address is required'),
    (0, express_validator_1.body)('shippingAddress.recipientName').notEmpty().withMessage('Shipping recipient name is required'),
    (0, express_validator_1.body)('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
    (0, express_validator_1.body)('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
    (0, express_validator_1.body)('shippingAddress.address').notEmpty().withMessage('Shipping address is required'),
    (0, express_validator_1.body)('paymentMethod').isIn(['card', 'transfer', 'virtual_account', 'kakao_pay', 'naver_pay', 'paypal', 'cash_on_delivery'])
        .withMessage('Invalid payment method')
];
const validateCreateOrderFromCart = [
    (0, express_validator_1.body)('billingAddress.recipientName').notEmpty().withMessage('Billing recipient name is required'),
    (0, express_validator_1.body)('billingAddress.phone').notEmpty().withMessage('Billing phone is required'),
    (0, express_validator_1.body)('billingAddress.zipCode').notEmpty().withMessage('Billing zip code is required'),
    (0, express_validator_1.body)('billingAddress.address').notEmpty().withMessage('Billing address is required'),
    (0, express_validator_1.body)('shippingAddress.recipientName').notEmpty().withMessage('Shipping recipient name is required'),
    (0, express_validator_1.body)('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
    (0, express_validator_1.body)('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
    (0, express_validator_1.body)('shippingAddress.address').notEmpty().withMessage('Shipping address is required'),
    (0, express_validator_1.body)('paymentMethod').isIn(['card', 'transfer', 'virtual_account', 'kakao_pay', 'naver_pay', 'paypal', 'cash_on_delivery'])
        .withMessage('Invalid payment method')
];
const validateOrderId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Order ID must be a valid UUID')
];
const validateOrderStatus = [
    (0, express_validator_1.body)('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
        .withMessage('Invalid order status')
];
const validatePaymentStatus = [
    (0, express_validator_1.body)('paymentStatus').isIn(['pending', 'completed', 'failed', 'refunded'])
        .withMessage('Invalid payment status')
];
const validateRefundRequest = [
    (0, express_validator_1.body)('reason').notEmpty().withMessage('Refund reason is required'),
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number')
];
// Routes
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, returned]
 *         description: Filter by order status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders to this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in order number, buyer name, or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of orders per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)(orderController.getOrders));
/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)(orderController.getOrderStats));
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', auth_middleware_1.authenticate, validateOrderId, (0, error_handler_1.asyncHandler)(orderController.getOrder));
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - billingAddress
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *               billingAddress:
 *                 $ref: '#/components/schemas/Address'
 *               shippingAddress:
 *                 $ref: '#/components/schemas/Address'
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, transfer, virtual_account, kakao_pay, naver_pay, paypal, cash_on_delivery]
 *               notes:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_middleware_1.authenticate, validateCreateOrder, (0, error_handler_1.asyncHandler)(orderController.createOrder));
/**
 * @swagger
 * /api/orders/from-cart:
 *   post:
 *     summary: Create order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - billingAddress
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               cartId:
 *                 type: string
 *                 format: uuid
 *                 description: Cart ID (optional, uses user ID if not provided)
 *               billingAddress:
 *                 $ref: '#/components/schemas/Address'
 *               shippingAddress:
 *                 $ref: '#/components/schemas/Address'
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, transfer, virtual_account, kakao_pay, naver_pay, paypal, cash_on_delivery]
 *               notes:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully from cart
 *       400:
 *         description: Validation error or cart is empty
 *       401:
 *         description: Unauthorized
 */
router.post('/from-cart', auth_middleware_1.authenticate, validateCreateOrderFromCart, (0, error_handler_1.asyncHandler)(orderController.createOrderFromCart));
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled, returned]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Order not found
 */
router.patch('/:id/status', auth_middleware_1.authenticate, validateOrderId, validateOrderStatus, (0, error_handler_1.asyncHandler)(orderController.updateOrderStatus));
/**
 * @swagger
 * /api/orders/{id}/payment-status:
 *   patch:
 *     summary: Update payment status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, completed, failed, refunded]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid payment status
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Order not found
 */
router.patch('/:id/payment-status', auth_middleware_1.authenticate, validateOrderId, validatePaymentStatus, (0, error_handler_1.asyncHandler)(orderController.updatePaymentStatus));
/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/cancel', auth_middleware_1.authenticate, validateOrderId, (0, error_handler_1.asyncHandler)(orderController.cancelOrder));
/**
 * @swagger
 * /api/orders/{id}/refund:
 *   post:
 *     summary: Request refund
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Refund reason
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Refund amount (optional, defaults to full amount)
 *     responses:
 *       200:
 *         description: Refund requested successfully
 *       400:
 *         description: Order cannot be refunded or validation error
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/refund', auth_middleware_1.authenticate, validateOrderId, validateRefundRequest, (0, error_handler_1.asyncHandler)(orderController.requestRefund));
/**
 * @swagger
 * /api/orders/{id}/reorder:
 *   post:
 *     summary: Create new order based on existing order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Original order ID
 *     responses:
 *       201:
 *         description: Reorder created successfully
 *       404:
 *         description: Original order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/reorder', auth_middleware_1.authenticate, validateOrderId, (0, error_handler_1.asyncHandler)(orderController.reorder));
/**
 * @swagger
 * /api/orders/{id}/tracking:
 *   get:
 *     summary: Get order tracking information
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Tracking information retrieved successfully
 *       404:
 *         description: Order not found or tracking not available
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/tracking', auth_middleware_1.authenticate, validateOrderId, (0, error_handler_1.asyncHandler)(orderController.getOrderTracking));
/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Download order invoice
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Invoice downloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/invoice', auth_middleware_1.authenticate, validateOrderId, (0, error_handler_1.asyncHandler)(orderController.downloadInvoice));
exports.default = router;
//# sourceMappingURL=orders.routes.js.map