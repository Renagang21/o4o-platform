"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const approvalController_1 = require("../../controllers/approvalController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const approvalController = new approvalController_1.ApprovalController();
// Validation rules
const pricingApprovalValidation = [
    (0, express_validator_1.body)('entityId').notEmpty().withMessage('Entity ID is required'),
    (0, express_validator_1.body)('changes').isObject().withMessage('Changes must be an object'),
    (0, express_validator_1.body)('currentValues').isObject().withMessage('Current values must be an object')
];
const autonomousPricingValidation = [
    (0, express_validator_1.body)('entityId').notEmpty().withMessage('Entity ID is required'),
    (0, express_validator_1.body)('sellerPrice').isNumeric().withMessage('Seller price must be a number').isFloat({ min: 0 }).withMessage('Seller price must be positive')
];
const approvalActionValidation = [
    (0, express_validator_1.param)('requestId').notEmpty().withMessage('Request ID is required')
];
const rejectionValidation = [
    ...approvalActionValidation,
    (0, express_validator_1.body)('rejectionReason').notEmpty().withMessage('Rejection reason is required').isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
];
const complianceValidation = [
    (0, express_validator_1.body)('changes').isObject().withMessage('Changes must be an object')
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
router.post('/pricing', auth_middleware_1.authenticate, pricingApprovalValidation, validation_middleware_1.validateRequest, approvalController.createPricingApproval.bind(approvalController));
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
router.post('/autonomous-pricing', auth_middleware_1.authenticate, autonomousPricingValidation, validation_middleware_1.validateRequest, approvalController.processAutonomousPricing.bind(approvalController));
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
router.post('/approve/:requestId', auth_middleware_1.authenticate, approvalActionValidation, validation_middleware_1.validateRequest, approvalController.approvePricingRequest.bind(approvalController));
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
router.post('/reject/:requestId', auth_middleware_1.authenticate, rejectionValidation, validation_middleware_1.validateRequest, approvalController.rejectPricingRequest.bind(approvalController));
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
router.get('/queue', auth_middleware_1.authenticate, [
    (0, express_validator_1.query)('status').optional().isIn(['all', 'pending', 'approved', 'rejected', 'processed'])
], validation_middleware_1.validateRequest, approvalController.getApprovalQueue.bind(approvalController));
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
router.get('/pending', auth_middleware_1.authenticate, [
    (0, express_validator_1.query)('entityType').optional().isIn(['ds_product', 'ds_supplier', 'ds_partner']),
    (0, express_validator_1.query)('requestType').optional().isIn(['pricing_change', 'commission_change', 'supplier_update']),
    (0, express_validator_1.query)('requestedBy').optional().isString()
], validation_middleware_1.validateRequest, approvalController.getPendingRequests.bind(approvalController));
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
router.get('/history/:entityId', auth_middleware_1.authenticate, [(0, express_validator_1.param)('entityId').notEmpty().withMessage('Entity ID is required')], validation_middleware_1.validateRequest, approvalController.getRequestHistory.bind(approvalController));
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
router.post('/check-compliance', auth_middleware_1.authenticate, complianceValidation, validation_middleware_1.validateRequest, approvalController.checkCompliance.bind(approvalController));
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
router.get('/permissions', auth_middleware_1.authenticate, approvalController.getUserPermissions.bind(approvalController));
exports.default = router;
//# sourceMappingURL=approval.routes.js.map