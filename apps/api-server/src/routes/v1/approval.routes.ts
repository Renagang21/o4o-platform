import { Router } from 'express';
import { ApprovalController } from '../../controllers/approvalController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { body, param, query } from 'express-validator';

const router: Router = Router();
const approvalController = new ApprovalController();

// Validation rules
const pricingApprovalValidation = [
  body('entityId').notEmpty().withMessage('Entity ID is required'),
  body('changes').isObject().withMessage('Changes must be an object'),
  body('currentValues').isObject().withMessage('Current values must be an object')
];

const autonomousPricingValidation = [
  body('entityId').notEmpty().withMessage('Entity ID is required'),
  body('sellerPrice').isNumeric().withMessage('Seller price must be a number').isFloat({ min: 0 }).withMessage('Seller price must be positive')
];

const approvalActionValidation = [
  param('requestId').notEmpty().withMessage('Request ID is required')
];

const rejectionValidation = [
  ...approvalActionValidation,
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required').isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
];

const complianceValidation = [
  body('changes').isObject().withMessage('Changes must be an object')
];

/**
 * @swagger
 * /api/v1/approval/pricing:
 *   post:
 *     summary: Create pricing approval request
 *     description: Create a request for approval when suppliers change cost price, MSRP, or commission rates
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityId:
 *                 type: string
 *                 description: Product or entity ID
 *               changes:
 *                 type: object
 *                 properties:
 *                   cost_price:
 *                     type: number
 *                   msrp:
 *                     type: number
 *                   partner_commission_rate:
 *                     type: number
 *               currentValues:
 *                 type: object
 *                 description: Current values before changes
 *     responses:
 *       201:
 *         description: Approval request created successfully
 *       400:
 *         description: Legal compliance violations detected
 *       401:
 *         description: Authentication required
 */
router.post(
  '/pricing',
  authenticate,
  pricingApprovalValidation,
  validateRequest,
  approvalController.createPricingApproval.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/autonomous-pricing:
 *   post:
 *     summary: Process seller autonomous pricing
 *     description: Allow sellers to set their own selling price autonomously (법률 준수)
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityId:
 *                 type: string
 *                 description: Product ID
 *               sellerPrice:
 *                 type: number
 *                 description: Seller's autonomous price
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Autonomous pricing set successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only sellers can set autonomous pricing
 */
router.post(
  '/autonomous-pricing',
  authenticate,
  autonomousPricingValidation,
  validateRequest,
  approvalController.processAutonomousPricing.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/{requestId}/approve:
 *   post:
 *     summary: Approve pricing request
 *     description: Approve a pending pricing change request (admin only)
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalNotes:
 *                 type: string
 *                 description: Optional approval notes
 *     responses:
 *       200:
 *         description: Request approved successfully
 *       400:
 *         description: Request cannot be approved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/approve/:requestId',
  authenticate,
  approvalActionValidation,
  validateRequest,
  approvalController.approvePricingRequest.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/{requestId}/reject:
 *   post:
 *     summary: Reject pricing request
 *     description: Reject a pending pricing change request (admin only)
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection (required)
 *                 minLength: 10
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *       400:
 *         description: Invalid rejection reason
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/reject/:requestId',
  authenticate,
  rejectionValidation,
  validateRequest,
  approvalController.rejectPricingRequest.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/queue:
 *   get:
 *     summary: Get approval queue
 *     description: Get approval queue for admin dashboard (admin only)
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, approved, rejected]
 *           default: pending
 *         description: Filter by approval status
 *     responses:
 *       200:
 *         description: List of approval requests
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get(
  '/queue',
  authenticate,
  [
    query('status').optional().isIn(['all', 'pending', 'approved', 'rejected', 'processed'])
  ],
  validateRequest,
  approvalController.getApprovalQueue.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/pending:
 *   get:
 *     summary: Get pending approval requests
 *     description: Get list of pending approval requests (admin only)
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [ds_product, ds_supplier, ds_partner]
 *         description: Filter by entity type
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [pricing_change, commission_change, supplier_update]
 *         description: Filter by request type
 *       - in: query
 *         name: requestedBy
 *         schema:
 *           type: string
 *         description: Filter by requester ID
 *     responses:
 *       200:
 *         description: List of pending requests
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/pending',
  authenticate,
  [
    query('entityType').optional().isIn(['ds_product', 'ds_supplier', 'ds_partner']),
    query('requestType').optional().isIn(['pricing_change', 'commission_change', 'supplier_update']),
    query('requestedBy').optional().isString()
  ],
  validateRequest,
  approvalController.getPendingRequests.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/history/{entityId}:
 *   get:
 *     summary: Get approval request history
 *     description: Get approval request history for a specific entity
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
 *     responses:
 *       200:
 *         description: Approval request history
 *       401:
 *         description: Authentication required
 */
router.get(
  '/history/:entityId',
  authenticate,
  [param('entityId').notEmpty().withMessage('Entity ID is required')],
  validateRequest,
  approvalController.getRequestHistory.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/check-compliance:
 *   post:
 *     summary: Check legal compliance
 *     description: Validate if proposed changes comply with fair trade law
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               changes:
 *                 type: object
 *                 description: Proposed changes to validate
 *     responses:
 *       200:
 *         description: Compliance check results
 *       401:
 *         description: Authentication required
 */
router.post(
  '/check-compliance',
  authenticate,
  complianceValidation,
  validateRequest,
  approvalController.checkCompliance.bind(approvalController)
);

/**
 * @swagger
 * /api/v1/approval/permissions:
 *   get:
 *     summary: Get user approval permissions
 *     description: Get current user's approval permissions and capabilities
 *     tags: [Approval Workflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions
 *       401:
 *         description: Authentication required
 */
router.get(
  '/permissions',
  authenticate,
  approvalController.getUserPermissions.bind(approvalController)
);

export default router;