import { Router } from 'express';
import { body, param } from 'express-validator';
import { StorefrontController } from '../controllers/StorefrontController.js';
import { asyncHandler } from '../middleware/error-handler.js';

/**
 * Storefront Order Routes (Phase 3)
 *
 * Public API for customer-facing storefront operations.
 * Endpoints: /api/v1/storefront/orders
 */

const router: Router = Router();
const storefrontController = new StorefrontController();

// Validation middleware
const validateCreateOrder = [
  body('customer.name').notEmpty().withMessage('Customer name is required'),
  body('customer.email').isEmail().withMessage('Valid email is required'),
  body('customer.phone').notEmpty().withMessage('Customer phone is required'),
  body('customer.address.postcode').notEmpty().withMessage('Postcode is required'),
  body('customer.address.addr1').notEmpty().withMessage('Address line 1 is required'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
  body('items.*.product_id').isUUID().withMessage('Product ID must be a valid UUID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
];

const validateOrderId = [
  param('id').isUUID().withMessage('Order ID must be a valid UUID')
];

/**
 * @swagger
 * /api/v1/storefront/orders:
 *   post:
 *     summary: Create order from storefront cart
 *     tags: [Storefront]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - items
 *             properties:
 *               customer:
 *                 type: object
 *                 required:
 *                   - name
 *                   - email
 *                   - phone
 *                   - address
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: object
 *                     required:
 *                       - postcode
 *                       - addr1
 *                     properties:
 *                       postcode:
 *                         type: string
 *                       addr1:
 *                         type: string
 *                       addr2:
 *                         type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     seller_id:
 *                       type: string
 *                       format: uuid
 *                       description: Seller ID (optional, from frontend cart)
 *               payment_method:
 *                 type: string
 *                 enum: [card, transfer, virtual_account, kakao_pay, naver_pay, paypal, cash_on_delivery]
 *                 default: card
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.post('/', validateCreateOrder, asyncHandler(storefrontController.createOrder));

/**
 * @swagger
 *  /api/v1/storefront/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Storefront]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', validateOrderId, asyncHandler(storefrontController.getOrder));

export default router;
