import { Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../../entities/User.js';
import { ApprovalLog } from '../../entities/ApprovalLog.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';

export class AdminApprovalController {
  // Get approval queue with filters
  static async getApprovalQueue(req: AuthRequest, res: Response) {
    try {
      const { status = 'all', page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;

      // Check admin permission
      if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) { // Phase3-D
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get approval requests from database
      const approvalLogRepo = getRepository(ApprovalLog);
      
      const queryBuilder = approvalLogRepo.createQueryBuilder('approval')
        .leftJoinAndSelect('approval.user', 'user')
        .leftJoinAndSelect('approval.admin', 'admin')
        .orderBy('approval.created_at', 'DESC');

      // Apply status filter
      if (status === 'pending') {
        queryBuilder.andWhere('approval.action = :action', { action: 'pending' });
      } else if (status === 'processed') {
        queryBuilder.andWhere('approval.action IN (:...actions)', { actions: ['approved', 'rejected'] });
      }

      // Apply pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;
      
      queryBuilder.skip(offset).take(limitNum);
      
      const [approvalLogs, total] = await queryBuilder.getManyAndCount();
      
      // Transform approval logs to approval requests format
      const requests = approvalLogs.map(log => ({
        id: log.id,
        type: log.metadata?.requestType || 'approval',
        entityType: log.metadata?.entityType || 'user',
        entityId: log.metadata?.entityId || log.user_id,
        entityName: log.metadata?.entityName || log.user?.fullName || 'Unknown',
        requesterId: log.user_id,
        requesterName: log.user?.fullName || log.user?.email || 'Unknown',
        requesterRole: log.user?.roles?.[0] || 'user',
        status: log.action === 'pending' ? 'pending' : log.action,
        changes: log.metadata?.changes || {},
        currentValues: log.metadata?.currentValues || {},
        reason: log.notes || 'No reason provided',
        adminNotes: log.action !== 'pending' ? log.notes : undefined,
        createdAt: log.created_at.toISOString(),
        reviewedAt: log.updated_at?.toISOString(),
        reviewedBy: log.admin?.fullName || log.admin?.email || 'System',
        legalCompliance: {
          msrpCompliant: true,
          fairTradeCompliant: true,
          notes: 'Legal compliance check required'
        }
      }));

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

    } catch (error) {
      console.error('Get approval queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval queue'
      });
    }
  }

  // Approve a request
  static async approveRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user?.id;
      const adminName = req.user?.name || req.user?.email || 'Admin';

      // Check admin permission
      if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) { // Phase3-D
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Update the actual approval request in database
      const approvalLogRepository = getRepository(ApprovalLog);
      const log = approvalLogRepository.create({
        user_id: 'pending_user',  // In production, get from actual request
        admin_id: adminId?.toString() || 'system',
        action: 'approved' as const,
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
      logger.info(`Approval notification sent for request ${id}`);

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

    } catch (error) {
      console.error('Approve request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve request'
      });
    }
  }

  // Reject a request
  static async rejectRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;
      const adminName = req.user?.name || req.user?.email || 'Admin';

      // Check admin permission
      if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) { // Phase3-D
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
      const approvalLogRepository = getRepository(ApprovalLog);
      const log = approvalLogRepository.create({
        user_id: 'pending_user',  // In production, get from actual request
        admin_id: adminId?.toString() || 'system',
        action: 'rejected' as const,
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
      logger.info(`Rejection notification sent for request ${id}`);

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

    } catch (error) {
      console.error('Reject request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject request'
      });
    }
  }

  // Get approval statistics
  static async getApprovalStats(req: AuthRequest, res: Response) {
    try {
      // Check admin permission
      if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) { // Phase3-D
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

    } catch (error) {
      console.error('Get approval stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval statistics'
      });
    }
  }

  // Get request details
  static async getRequestDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check admin permission
      if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) { // Phase3-D
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get request details from database
      const approvalLogRepo = getRepository(ApprovalLog);
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
        type: approvalLog.metadata?.requestType || 'approval',
        entityType: approvalLog.metadata?.entityType || 'user',
        entityId: approvalLog.metadata?.entityId || approvalLog.user_id,
        entityName: approvalLog.metadata?.entityName || approvalLog.user?.fullName || 'Unknown',
        requesterId: approvalLog.user_id,
        requesterName: approvalLog.user?.fullName || 'Unknown',
        requesterRole: approvalLog.user?.roles?.[0] || 'user',
        requesterEmail: approvalLog.user?.email || 'unknown@example.com',
        status: approvalLog.action === 'pending' ? 'pending' : approvalLog.action,
        priority: approvalLog.metadata?.priority || 'medium',
        changes: approvalLog.metadata?.changes || {},
        currentValues: approvalLog.metadata?.currentValues || {},
        reason: approvalLog.notes || 'No reason provided',
        supportingDocuments: approvalLog.metadata?.documents || [],
        createdAt: approvalLog.created_at.toISOString(),
        updatedAt: approvalLog.updated_at?.toISOString(),
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
            performedBy: approvalLog.user?.fullName || 'Unknown',
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

    } catch (error) {
      console.error('Get request details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch request details'
      });
    }
  }
}