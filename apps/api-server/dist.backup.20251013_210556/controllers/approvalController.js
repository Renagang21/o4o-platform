"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalController = void 0;
const approval_workflow_service_1 = require("../services/approval-workflow.service");
class ApprovalController {
    /**
     * Create pricing approval request
     * POST /api/v1/approval/pricing
     */
    async createPricingApproval(req, res) {
        var _a;
        try {
            const { entityId, changes, currentValues } = req.body;
            const requestedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!requestedBy) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Validate legal compliance
            const complianceCheck = approval_workflow_service_1.approvalWorkflowService.validateLegalCompliance(changes);
            if (!complianceCheck.isCompliant) {
                return res.status(400).json({
                    success: false,
                    message: 'Legal compliance violations detected',
                    violations: complianceCheck.violations,
                    warnings: complianceCheck.warnings
                });
            }
            const approvalRequest = await approval_workflow_service_1.approvalWorkflowService.createPricingApprovalRequest(entityId, requestedBy, changes, currentValues);
            res.status(201).json({
                success: true,
                message: 'Approval request created',
                data: {
                    requestId: approvalRequest.id,
                    status: approvalRequest.status,
                    estimatedApprovalTime: '24-48 hours',
                    complianceWarnings: complianceCheck.warnings
                }
            });
        }
        catch (error) {
            console.error('Error creating pricing approval:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Process seller autonomous pricing
     * POST /api/v1/approval/autonomous-pricing
     */
    async processAutonomousPricing(req, res) {
        var _a, _b;
        try {
            const { entityId, sellerPrice, metadata } = req.body;
            const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!sellerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Verify user is a seller
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.roles) && !req.user.roles.includes('seller')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only sellers can set autonomous pricing'
                });
            }
            await approval_workflow_service_1.approvalWorkflowService.processSellerAutonomousPricing(entityId, sellerId, sellerPrice, metadata);
            res.status(200).json({
                success: true,
                message: '판매가가 자율적으로 설정되었습니다',
                data: {
                    entityId,
                    sellerPrice,
                    setBy: sellerId,
                    timestamp: new Date().toISOString(),
                    legalNote: '공정거래법에 따라 판매자의 가격 자율성이 보장됩니다'
                }
            });
        }
        catch (error) {
            console.error('Error processing autonomous pricing:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Approve pricing request
     * POST /api/v1/approval/approve/:requestId
     */
    async approvePricingRequest(req, res) {
        var _a;
        try {
            const { requestId } = req.params;
            const { adminNotes, approvalNotes } = req.body;
            const approvedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!approvedBy) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await approval_workflow_service_1.approvalWorkflowService.approvePricingRequest(requestId, approvedBy, adminNotes || approvalNotes);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    requestId,
                    approvedBy,
                    approvedAt: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error approving request:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Reject pricing request
     * POST /api/v1/approval/reject/:requestId
     */
    async rejectPricingRequest(req, res) {
        var _a;
        try {
            const { requestId } = req.params;
            const { reason, rejectionReason } = req.body;
            const rejectedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!rejectedBy) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const finalReason = reason || rejectionReason;
            if (!finalReason) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required'
                });
            }
            const result = await approval_workflow_service_1.approvalWorkflowService.rejectPricingRequest(requestId, rejectedBy, finalReason);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    requestId,
                    rejectedBy,
                    rejectedAt: new Date().toISOString(),
                    reason: rejectionReason
                }
            });
        }
        catch (error) {
            console.error('Error rejecting request:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Get pending approval requests
     * GET /api/v1/approval/pending
     */
    async getPendingRequests(req, res) {
        var _a;
        try {
            const { entityType, requestType, requestedBy } = req.query;
            // Check if user can view approval requests
            const canView = await approval_workflow_service_1.approvalWorkflowService.canApprove(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '', 'pricing_change');
            if (!canView) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions to view approval requests'
                });
            }
            const requests = await approval_workflow_service_1.approvalWorkflowService.getPendingRequests({
                entityType: entityType,
                requestType: requestType,
                requestedBy: requestedBy
            });
            res.status(200).json({
                success: true,
                data: requests,
                count: requests.length
            });
        }
        catch (error) {
            console.error('Error getting pending requests:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Get approval queue
     * GET /api/v1/approval/queue
     */
    async getApprovalQueue(req, res) {
        var _a, _b, _c, _d;
        try {
            const { status = 'pending' } = req.query;
            // Check if user is admin
            if (!((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.roles) === null || _b === void 0 ? void 0 : _b.includes('admin')) && !((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.roles) === null || _d === void 0 ? void 0 : _d.includes('administrator'))) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            const requests = await approval_workflow_service_1.approvalWorkflowService.getApprovalQueue(status);
            res.status(200).json({
                success: true,
                requests: requests,
                count: requests.length
            });
        }
        catch (error) {
            console.error('Error getting approval queue:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Get approval request history
     * GET /api/v1/approval/history/:entityId
     */
    async getRequestHistory(req, res) {
        try {
            const { entityId } = req.params;
            const history = await approval_workflow_service_1.approvalWorkflowService.getRequestHistory(entityId);
            res.status(200).json({
                success: true,
                data: history,
                count: history.length
            });
        }
        catch (error) {
            console.error('Error getting request history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Check legal compliance
     * POST /api/v1/approval/check-compliance
     */
    async checkCompliance(req, res) {
        try {
            const { changes } = req.body;
            const complianceCheck = approval_workflow_service_1.approvalWorkflowService.validateLegalCompliance(changes);
            res.status(200).json({
                success: true,
                data: {
                    isCompliant: complianceCheck.isCompliant,
                    violations: complianceCheck.violations,
                    warnings: complianceCheck.warnings,
                    recommendation: complianceCheck.isCompliant
                        ? '법적 준수 요건을 충족합니다'
                        : '법적 준수 요건을 검토해야 합니다'
                }
            });
        }
        catch (error) {
            console.error('Error checking compliance:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Get user approval permissions
     * GET /api/v1/approval/permissions
     */
    async getUserPermissions(req, res) {
        var _a, _b;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const canApprovePricing = await approval_workflow_service_1.approvalWorkflowService.canApprove(userId, 'pricing_change');
            const canApproveCommission = await approval_workflow_service_1.approvalWorkflowService.canApprove(userId, 'commission_change');
            res.status(200).json({
                success: true,
                data: {
                    userId,
                    permissions: {
                        canApprovePricing,
                        canApproveCommission,
                        canViewRequests: canApprovePricing || canApproveCommission
                    },
                    userRoles: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roles) || []
                }
            });
        }
        catch (error) {
            console.error('Error getting user permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.ApprovalController = ApprovalController;
//# sourceMappingURL=approvalController.js.map