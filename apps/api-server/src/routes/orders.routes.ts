import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { OrderController } from '../controllers/OrderController';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';

const router: Router = Router();
const orderController = new OrderController();

// Validation middleware
const validateCreateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
  body('items.*.productId').isUUID().withMessage('Product ID must be a valid UUID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('billingAddress.recipientName').notEmpty().withMessage('Billing recipient name is required'),
  body('billingAddress.phone').notEmpty().withMessage('Billing phone is required'),
  body('billingAddress.zipCode').notEmpty().withMessage('Billing zip code is required'),
  body('billingAddress.address').notEmpty().withMessage('Billing address is required'),
  body('shippingAddress.recipientName').notEmpty().withMessage('Shipping recipient name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.address').notEmpty().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['card', 'transfer', 'virtual_account', 'kakao_pay', 'naver_pay', 'paypal', 'cash_on_delivery'])
    .withMessage('Invalid payment method')
];

const validateCreateOrderFromCart = [
  body('billingAddress.recipientName').notEmpty().withMessage('Billing recipient name is required'),
  body('billingAddress.phone').notEmpty().withMessage('Billing phone is required'),
  body('billingAddress.zipCode').notEmpty().withMessage('Billing zip code is required'),
  body('billingAddress.address').notEmpty().withMessage('Billing address is required'),
  body('shippingAddress.recipientName').notEmpty().withMessage('Shipping recipient name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.address').notEmpty().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['card', 'transfer', 'virtual_account', 'kakao_pay', 'naver_pay', 'paypal', 'cash_on_delivery'])
    .withMessage('Invalid payment method')
];

const validateOrderId = [
  param('id').isUUID().withMessage('Order ID must be a valid UUID')
];

const validateOrderStatus = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status')
];

const validatePaymentStatus = [
  body('paymentStatus').isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status')
];

const validateRefundRequest = [
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number')
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
router.get('/', authenticate, asyncHandler(orderController.getOrders));

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
router.get('/stats', authenticate, asyncHandler(orderController.getOrderStats));

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
router.get('/:id', authenticate, validateOrderId, asyncHandler(orderController.getOrder));

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
router.post('/', authenticate, validateCreateOrder, asyncHandler(orderController.createOrder));

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
router.post('/from-cart', authenticate, validateCreateOrderFromCart, asyncHandler(orderController.createOrderFromCart));

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
router.patch('/:id/status', authenticate, validateOrderId, validateOrderStatus, asyncHandler(orderController.updateOrderStatus));

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
router.patch('/:id/payment-status', authenticate, validateOrderId, validatePaymentStatus, asyncHandler(orderController.updatePaymentStatus));

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
router.post('/:id/cancel', authenticate, validateOrderId, asyncHandler(orderController.cancelOrder));

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
router.post('/:id/refund', authenticate, validateOrderId, validateRefundRequest, asyncHandler(orderController.requestRefund));

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
router.post('/:id/reorder', authenticate, validateOrderId, asyncHandler(orderController.reorder));

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
router.get('/:id/tracking', authenticate, validateOrderId, asyncHandler(orderController.getOrderTracking));

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
router.get('/:id/invoice', authenticate, validateOrderId, asyncHandler(orderController.downloadInvoice));

export default router;