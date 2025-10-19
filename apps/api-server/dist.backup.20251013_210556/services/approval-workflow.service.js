"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalWorkflowService = exports.ApprovalWorkflowService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const logger_1 = __importDefault(require("../utils/logger"));
class ApprovalWorkflowService {
    constructor() {
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    }
    /**
     * Create approval request for pricing changes
     */
    async createPricingApprovalRequest(entityId, requestedBy, changes, currentValues) {
        const request = {
            id: this.generateRequestId(),
            entityType: 'ds_product',
            entityId,
            requestType: 'pricing_change',
            requestedBy,
            requestedAt: new Date(),
            status: 'pending',
            changes,
            currentValues,
            metadata: {
                legal_compliance: true,
                requires_admin_approval: true,
                change_type: 'supplier_pricing'
            }
        };
        // Store in pending approvals table (would need to create this entity)
        await this.storePendingRequest(request);
        logger_1.default.info(`🚨 Approval request created: ${request.id} for entity ${entityId}`);
        return request;
    }
    /**
     * Process seller autonomous pricing (no approval needed)
     */
    async processSellerAutonomousPricing(entityId, sellerId, sellerPrice, metadata) {
        // Seller pricing is autonomous - no approval required
        const logEntry = {
            entityId,
            sellerId,
            sellerPrice,
            timestamp: new Date(),
            type: 'autonomous_pricing',
            legal_compliance: 'seller_autonomy_protected',
            metadata
        };
        await this.logAutonomousPricing(logEntry);
        logger_1.default.info(`✅ Autonomous pricing set by seller ${sellerId} for product ${entityId}: ₩${sellerPrice.toLocaleString()}`);
    }
    /**
     * Check if user has approval permissions
     */
    async canApprove(userId, requestType) {
        var _a;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user)
            return false;
        // Only admins and managers can approve pricing changes
        const adminRoles = ['admin', 'super_admin', 'pricing_manager'];
        return ((_a = user.roles) === null || _a === void 0 ? void 0 : _a.some(role => adminRoles.includes(role))) || false;
    }
    /**
     * Approve pricing request
     */
    async approvePricingRequest(requestId, approvedBy, approvalNotes) {
        try {
            const request = await this.getPendingRequest(requestId);
            if (!request) {
                return { success: false, message: 'Approval request not found' };
            }
            if (request.status !== 'pending') {
                return { success: false, message: 'Request already processed' };
            }
            const canApprove = await this.canApprove(approvedBy, request.requestType);
            if (!canApprove) {
                return { success: false, message: 'Insufficient permissions to approve' };
            }
            // Update request status
            request.status = 'approved';
            request.approvedBy = approvedBy;
            request.approvedAt = new Date();
            request.metadata = {
                ...request.metadata,
                approval_notes: approvalNotes,
                approved_timestamp: new Date().toISOString()
            };
            // Apply the approved changes to the actual entity
            await this.applyApprovedChanges(request);
            // Update the stored request
            await this.updatePendingRequest(request);
            logger_1.default.info(`✅ Pricing request ${requestId} approved by ${approvedBy}`);
            return { success: true, message: 'Request approved successfully' };
        }
        catch (error) {
            console.error('Error approving request:', error);
            return { success: false, message: 'Error processing approval' };
        }
    }
    /**
     * Reject pricing request
     */
    async rejectPricingRequest(requestId, rejectedBy, rejectionReason) {
        try {
            const request = await this.getPendingRequest(requestId);
            if (!request) {
                return { success: false, message: 'Approval request not found' };
            }
            if (request.status !== 'pending') {
                return { success: false, message: 'Request already processed' };
            }
            const canApprove = await this.canApprove(rejectedBy, request.requestType);
            if (!canApprove) {
                return { success: false, message: 'Insufficient permissions to reject' };
            }
            // Update request status
            request.status = 'rejected';
            request.approvedBy = rejectedBy;
            request.approvedAt = new Date();
            request.rejectionReason = rejectionReason;
            request.metadata = {
                ...request.metadata,
                rejected_by: rejectedBy,
                rejected_timestamp: new Date().toISOString(),
                rejection_reason: rejectionReason
            };
            // Update the stored request
            await this.updatePendingRequest(request);
            logger_1.default.info(`❌ Pricing request ${requestId} rejected by ${rejectedBy}: ${rejectionReason}`);
            return { success: true, message: 'Request rejected' };
        }
        catch (error) {
            console.error('Error rejecting request:', error);
            return { success: false, message: 'Error processing rejection' };
        }
    }
    /**
     * Get pending requests for admin review
     */
    async getPendingRequests(filters) {
        // Would query from pending approvals table
        return this.queryPendingRequests(filters);
    }
    /**
     * Get request history for an entity
     */
    async getRequestHistory(entityId) {
        return this.queryRequestHistory(entityId);
    }
    /**
     * Get approval queue for admin dashboard
     */
    async getApprovalQueue(status = 'pending') {
        // Mock data for testing - replace with actual database query
        const mockRequests = [
            {
                id: 'req_001',
                type: 'pricing',
                entityType: 'ds_product',
                entityId: 'prod_001',
                entityName: '갤럭시 S24 Ultra',
                requesterId: 'supplier_001',
                requesterName: '삼성전자',
                requesterRole: 'supplier',
                status: 'pending',
                changes: {
                    cost_price: 1250000,
                    msrp: 1550000,
                    partner_commission_rate: 8
                },
                currentValues: {
                    cost_price: 1200000,
                    msrp: 1500000,
                    partner_commission_rate: 10
                },
                reason: '원자재 가격 상승으로 인한 공급가 조정',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                legalCompliance: {
                    msrpCompliant: true,
                    fairTradeCompliant: true,
                    notes: 'MSRP는 권장 가격으로 표시됨'
                }
            },
            {
                id: 'req_002',
                type: 'commission',
                entityType: 'ds_partner',
                entityId: 'partner_001',
                entityName: '김철수',
                requesterId: 'supplier_002',
                requesterName: 'LG전자',
                requesterRole: 'supplier',
                status: 'pending',
                changes: {
                    partner_commission_rate: 12
                },
                currentValues: {
                    partner_commission_rate: 15
                },
                reason: '파트너 실적 조정에 따른 수수료율 변경',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 86400000).toISOString(),
                legalCompliance: {
                    msrpCompliant: true,
                    fairTradeCompliant: true
                }
            }
        ];
        // Filter by status if not 'all'
        if (status !== 'all') {
            return mockRequests.filter(req => req.status === status);
        }
        return mockRequests;
    }
    // Private helper methods
    generateRequestId() {
        return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async storePendingRequest(request) {
        // Implementation would store in database
        // For now, store in memory or file system
        logger_1.default.debug('Storing pending request:', request.id);
    }
    async updatePendingRequest(request) {
        // Implementation would update in database
        logger_1.default.debug('Updating pending request:', request.id);
    }
    async getPendingRequest(requestId) {
        // Implementation would query from database
        logger_1.default.debug('Getting pending request:', requestId);
        return null; // Placeholder
    }
    async queryPendingRequests(filters) {
        // Implementation would query from database
        logger_1.default.debug('Querying pending requests with filters:', filters);
        return []; // Placeholder
    }
    async queryRequestHistory(entityId) {
        // Implementation would query from database
        logger_1.default.debug('Querying request history for:', entityId);
        return []; // Placeholder
    }
    async applyApprovedChanges(request) {
        // Implementation would apply changes to the actual entity
        logger_1.default.debug('Applying approved changes for request:', request.id);
        // Update the product/supplier/partner entity with approved values
        // This would use TypeORM to update the actual entity
    }
    async logAutonomousPricing(logEntry) {
        // Implementation would log autonomous pricing changes
        logger_1.default.debug('Logging autonomous pricing:', logEntry);
    }
    /**
     * Legal compliance validation
     */
    validateLegalCompliance(changes) {
        const violations = [];
        const warnings = [];
        // Check for price specification (법규 위반)
        if (changes.selling_price || changes.fixed_price || changes.mandatory_price) {
            violations.push('소비자 가격 지정은 공정거래법 위반입니다');
        }
        // Validate MSRP is marked as recommended
        if (changes.msrp && !changes.msrp_is_recommended) {
            warnings.push('MSRP는 권장 가격임을 명시해야 합니다');
        }
        // Check for autonomous pricing protection
        if (changes.seller_final_price && changes.restrict_seller_pricing) {
            violations.push('판매자 가격 자율성을 제한할 수 없습니다');
        }
        return {
            isCompliant: violations.length === 0,
            violations,
            warnings
        };
    }
}
exports.ApprovalWorkflowService = ApprovalWorkflowService;
exports.approvalWorkflowService = new ApprovalWorkflowService();
//# sourceMappingURL=approval-workflow.service.js.map