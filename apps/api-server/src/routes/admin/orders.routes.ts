import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminOrderController } from '../../controllers/AdminOrderController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkRole } from '../../middleware/checkRole.js';
import { asyncHandler } from '../../middleware/error-handler.js';

/**
 * Admin Order Routes (Phase 4)
 *
 * All routes require authentication and admin/operator role.
 * Endpoints: /api/v1/admin/orders
 */

const router: Router = Router();
const adminOrderController = new AdminOrderController();

// Apply authentication and role check to all routes
router.use(authenticate);
router.use(checkRole(['administrator', 'operator']));

// Validation middleware
const validateOrderId = [
  param('id').isUUID().withMessage('Order ID must be a valid UUID')
];

const validateOrderListQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status'),
  query('paymentStatus').optional().isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  query('sortBy').optional().isIn(['orderDate', 'totalAmount', 'status', 'buyerName'])
    .withMessage('Invalid sortBy field'),
  query('sortOrder').optional().isIn(['asc', 'desc'])
    .withMessage('Invalid sort order')
];

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     summary: Get all orders (admin only)
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, returned]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by order number, customer name, or email
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [orderDate, totalAmount, status, buyerName]
 *           default: orderDate
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin/operator role)
 */
router.get('/', validateOrderListQuery, asyncHandler(adminOrderController.getOrders));

/**
 * @swagger
 * /api/v1/admin/orders/stats/summary:
 *   get:
 *     summary: Get order statistics summary (admin only)
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats/summary', asyncHandler(adminOrderController.getOrderStats));

/**
 * @swagger
 * /api/v1/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID (admin only)
 *     tags: [Admin - Orders]
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
 *       403:
 *         description: Forbidden
 */
router.get('/:id', validateOrderId, asyncHandler(adminOrderController.getOrder));

export default router;
