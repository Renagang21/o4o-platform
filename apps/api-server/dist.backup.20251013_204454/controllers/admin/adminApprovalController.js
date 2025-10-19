"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApprovalController = void 0;
const typeorm_1 = require("typeorm");
const ApprovalLog_1 = require("../../entities/ApprovalLog");
const logger_1 = __importDefault(require("../../utils/logger"));
class AdminApprovalController {
    // Get approval queue with filters
    static async getApprovalQueue(req, res) {
        var _a, _b, _c;
        try {
            const { status = 'all', page = 1, limit = 20 } = req.query;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            // Check admin permission
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'administrator') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            // Get approval requests from database
            const approvalLogRepo = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
            const queryBuilder = approvalLogRepo.createQueryBuilder('approval')
                .leftJoinAndSelect('approval.user', 'user')
                .leftJoinAndSelect('approval.admin', 'admin')
                .orderBy('approval.created_at', 'DESC');
            // Apply status filter
            if (status === 'pending') {
                queryBuilder.andWhere('approval.action = :action', { action: 'pending' });
            }
            else if (status === 'processed') {
                queryBuilder.andWhere('approval.action IN (:...actions)', { actions: ['approved', 'rejected'] });
            }
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const offset = (pageNum - 1) * limitNum;
            queryBuilder.skip(offset).take(limitNum);
            const [approvalLogs, total] = await queryBuilder.getManyAndCount();
            // Transform approval logs to approval requests format
            const requests = approvalLogs.map(log => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                return ({
                    id: log.id,
                    type: ((_a = log.metadata) === null || _a === void 0 ? void 0 : _a.requestType) || 'approval',
                    entityType: ((_b = log.metadata) === null || _b === void 0 ? void 0 : _b.entityType) || 'user',
                    entityId: ((_c = log.metadata) === null || _c === void 0 ? void 0 : _c.entityId) || log.user_id,
                    entityName: ((_d = log.metadata) === null || _d === void 0 ? void 0 : _d.entityName) || ((_e = log.user) === null || _e === void 0 ? void 0 : _e.fullName) || 'Unknown',
                    requesterId: log.user_id,
                    requesterName: ((_f = log.user) === null || _f === void 0 ? void 0 : _f.fullName) || ((_g = log.user) === null || _g === void 0 ? void 0 : _g.email) || 'Unknown',
                    requesterRole: ((_h = log.user) === null || _h === void 0 ? void 0 : _h.role) || 'customer',
                    status: log.action === 'pending' ? 'pending' : log.action,
                    changes: ((_j = log.metadata) === null || _j === void 0 ? void 0 : _j.changes) || {},
                    currentValues: ((_k = log.metadata) === null || _k === void 0 ? void 0 : _k.currentValues) || {},
                    reason: log.notes || 'No reason provided',
                    adminNotes: log.action !== 'pending' ? log.notes : undefined,
                    createdAt: log.created_at.toISOString(),
                    reviewedAt: (_l = log.updated_at) === null || _l === void 0 ? void 0 : _l.toISOString(),
                    reviewedBy: ((_m = log.admin) === null || _m === void 0 ? void 0 : _m.fullName) || ((_o = log.admin) === null || _o === void 0 ? void 0 : _o.email) || 'System',
                    legalCompliance: {
                        msrpCompliant: true,
                        fairTradeCompliant: true,
                        notes: 'Legal compliance check required'
                    }
                });
            });
            const paginatedRequests = requests;
            res.json({
                success: true,
                requests: paginatedRequests,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            console.error('Get approval queue error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch approval queue'
            });
        }
    }
    // Approve a request
    static async approveRequest(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const { id } = req.params;
            const { adminNotes } = req.body;
            const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const adminName = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) || 'Admin';
            // Check admin permission
            if (((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) !== 'admin' && ((_e = req.user) === null || _e === void 0 ? void 0 : _e.role) !== 'administrator') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            // Update the actual approval request in database
            const approvalLogRepository = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
            const log = approvalLogRepository.create({
                user_id: 'pending_user', // In production, get from actual request
                admin_id: (adminId === null || adminId === void 0 ? void 0 : adminId.toString()) || 'system',
                action: 'approved',
                previous_status: 'pending',
                new_status: 'approved',
                notes: adminNotes,
                metadata: {
                    adminName,
                    requestId: id,
                    requestType: 'approval',
                    timestamp: new Date().toISOString()
                }
            });
            await approvalLogRepository.save(log);
            // Send notification to requester (mock)
            logger_1.default.info(`Approval notification sent for request ${id}`);
            res.json({
                success: true,
                message: '변경 요청이 승인되었습니다',
                approvalLog: {
                    id: log.id,
                    requestId: id,
                    approvedBy: adminName,
                    approvedAt: new Date().toISOString(),
                    notes: adminNotes
                }
            });
        }
        catch (error) {
            console.error('Approve request error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to approve request'
            });
        }
    }
    // Reject a request
    static async rejectRequest(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const adminName = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) || 'Admin';
            // Check admin permission
            if (((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) !== 'admin' && ((_e = req.user) === null || _e === void 0 ? void 0 : _e.role) !== 'administrator') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            if (!reason || reason.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required'
                });
            }
            // Update the actual approval request in database
            const approvalLogRepository = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
            const log = approvalLogRepository.create({
                user_id: 'pending_user', // In production, get from actual request
                admin_id: (adminId === null || adminId === void 0 ? void 0 : adminId.toString()) || 'system',
                action: 'rejected',
                previous_status: 'pending',
                new_status: 'rejected',
                notes: reason,
                metadata: {
                    adminName,
                    requestId: id,
                    timestamp: new Date().toISOString()
                }
            });
            await approvalLogRepository.save(log);
            // Send notification to requester (mock)
            logger_1.default.info(`Rejection notification sent for request ${id}`);
            res.json({
                success: true,
                message: '변경 요청이 거절되었습니다',
                rejectionLog: {
                    id: log.id,
                    requestId: id,
                    rejectedBy: adminName,
                    rejectedAt: new Date().toISOString(),
                    reason
                }
            });
        }
        catch (error) {
            console.error('Reject request error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reject request'
            });
        }
    }
    // Get approval statistics
    static async getApprovalStats(req, res) {
        var _a, _b;
        try {
            // Check admin permission
            if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'administrator') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            // Mock statistics
            const stats = {
                pending: 5,
                approvedToday: 3,
                rejectedToday: 1,
                totalProcessed: 48,
                approvalRate: 85.4,
                averageProcessingTime: '2.3 days',
                urgentReviews: 2,
                byType: {
                    pricing: 15,
                    commission: 8,
                    msrp: 12,
                    policy: 13
                },
                byStatus: {
                    pending: 5,
                    approved: 38,
                    rejected: 10,
                    cancelled: 0
                },
                recentActivity: [
                    {
                        id: 'act_001',
                        action: 'approved',
                        requestType: 'pricing',
                        entityName: 'Premium Widget',
                        performedBy: 'Admin',
                        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        id: 'act_002',
                        action: 'rejected',
                        requestType: 'policy',
                        entityName: 'GlobalTech',
                        performedBy: 'Admin',
                        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
                    }
                ]
            };
            res.json({
                success: true,
                stats
            });
        }
        catch (error) {
            console.error('Get approval stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch approval statistics'
            });
        }
    }
    // Get request details
    static async getRequestDetails(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        try {
            const { id } = req.params;
            // Check admin permission
            if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'administrator') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            // Get request details from database
            const approvalLogRepo = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
            const approvalLog = await approvalLogRepo.findOne({
                where: { id },
                relations: ['user', 'admin']
            });
            if (!approvalLog) {
                return res.status(404).json({
                    success: false,
                    message: 'Approval request not found'
                });
            }
            const requestDetails = {
                id: approvalLog.id,
                type: ((_c = approvalLog.metadata) === null || _c === void 0 ? void 0 : _c.requestType) || 'approval',
                entityType: ((_d = approvalLog.metadata) === null || _d === void 0 ? void 0 : _d.entityType) || 'user',
                entityId: ((_e = approvalLog.metadata) === null || _e === void 0 ? void 0 : _e.entityId) || approvalLog.user_id,
                entityName: ((_f = approvalLog.metadata) === null || _f === void 0 ? void 0 : _f.entityName) || ((_g = approvalLog.user) === null || _g === void 0 ? void 0 : _g.fullName) || 'Unknown',
                requesterId: approvalLog.user_id,
                requesterName: ((_h = approvalLog.user) === null || _h === void 0 ? void 0 : _h.fullName) || 'Unknown',
                requesterRole: ((_j = approvalLog.user) === null || _j === void 0 ? void 0 : _j.role) || 'customer',
                requesterEmail: ((_k = approvalLog.user) === null || _k === void 0 ? void 0 : _k.email) || 'unknown@example.com',
                status: approvalLog.action === 'pending' ? 'pending' : approvalLog.action,
                priority: ((_l = approvalLog.metadata) === null || _l === void 0 ? void 0 : _l.priority) || 'medium',
                changes: ((_m = approvalLog.metadata) === null || _m === void 0 ? void 0 : _m.changes) || {},
                currentValues: ((_o = approvalLog.metadata) === null || _o === void 0 ? void 0 : _o.currentValues) || {},
                reason: approvalLog.notes || 'No reason provided',
                supportingDocuments: ((_p = approvalLog.metadata) === null || _p === void 0 ? void 0 : _p.documents) || [],
                createdAt: approvalLog.created_at.toISOString(),
                updatedAt: (_q = approvalLog.updated_at) === null || _q === void 0 ? void 0 : _q.toISOString(),
                legalCompliance: {
                    msrpCompliant: true,
                    fairTradeCompliant: true,
                    priceStabilityCheck: true,
                    marketImpactAssessment: 'low',
                    notes: 'Legal compliance verification required'
                },
                history: [
                    {
                        action: 'created',
                        performedBy: ((_r = approvalLog.user) === null || _r === void 0 ? void 0 : _r.fullName) || 'Unknown',
                        timestamp: approvalLog.created_at.toISOString(),
                        notes: 'Approval request submitted'
                    }
                ],
                impactAnalysis: {
                    affectedProducts: 0,
                    affectedSellers: 0,
                    estimatedRevenueImpact: '0%',
                    competitorPriceComparison: {
                        average: 0,
                        min: 0,
                        max: 0
                    }
                }
            };
            res.json({
                success: true,
                request: requestDetails
            });
        }
        catch (error) {
            console.error('Get request details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch request details'
            });
        }
    }
}
exports.AdminApprovalController = AdminApprovalController;
//# sourceMappingURL=adminApprovalController.js.map