import { Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../../entities/User';
import { ApprovalLog } from '../../entities/ApprovalLog';
import { AuthRequest } from '../../types/auth';

export class AdminApprovalController {
  // Get approval queue with filters
  static async getApprovalQueue(req: AuthRequest, res: Response) {
    try {
      const { status = 'all', page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;

      // Check admin permission
      if (req.user?.role !== 'admin' && req.user?.role !== 'administrator') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Mock approval requests data for now
      const mockRequests = [
        {
          id: 'req_001',
          type: 'pricing',
          entityType: 'product',
          entityId: 'prod_123',
          entityName: 'Premium Widget Pro',
          requesterId: 'user_456',
          requesterName: '김공급',
          requesterRole: 'supplier',
          status: 'pending',
          changes: {
            cost_price: 150000,
            msrp: 299000,
            supplier_commission: 12
          },
          currentValues: {
            cost_price: 120000,
            msrp: 250000,
            supplier_commission: 10
          },
          reason: '원자재 가격 상승으로 인한 조정',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          legalCompliance: {
            msrpCompliant: true,
            fairTradeCompliant: true,
            notes: 'MSRP는 권장가격으로 표시되며 판매자 자율권 보장'
          }
        },
        {
          id: 'req_002',
          type: 'commission',
          entityType: 'supplier',
          entityId: 'supp_789',
          entityName: '테크솔루션',
          requesterId: 'user_789',
          requesterName: '이관리',
          requesterRole: 'supplier',
          status: 'pending',
          changes: {
            platform_commission: 8,
            supplier_commission: 15
          },
          currentValues: {
            platform_commission: 10,
            supplier_commission: 12
          },
          reason: '대량 공급 계약에 따른 수수료 조정 요청',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          legalCompliance: {
            msrpCompliant: true,
            fairTradeCompliant: true,
            notes: '수수료 조정은 공정거래법상 문제없음'
          }
        },
        {
          id: 'req_003',
          type: 'msrp',
          entityType: 'product',
          entityId: 'prod_456',
          entityName: 'Standard Bundle',
          requesterId: 'user_111',
          requesterName: '박공급',
          requesterRole: 'supplier',
          status: 'approved',
          changes: {
            msrp: 180000
          },
          currentValues: {
            msrp: 150000
          },
          reason: '제품 업그레이드에 따른 가격 조정',
          adminNotes: '합리적인 가격 조정으로 승인',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          reviewedBy: 'Admin',
          legalCompliance: {
            msrpCompliant: true,
            fairTradeCompliant: true,
            notes: '정상적인 MSRP 조정'
          }
        },
        {
          id: 'req_004',
          type: 'policy',
          entityType: 'supplier',
          entityId: 'supp_222',
          entityName: '글로벌테크',
          requesterId: 'user_222',
          requesterName: '최대표',
          requesterRole: 'supplier',
          status: 'rejected',
          changes: {
            minimum_order_quantity: 1000,
            bulk_discount_rate: 25
          },
          currentValues: {
            minimum_order_quantity: 100,
            bulk_discount_rate: 15
          },
          reason: '대량 주문 정책 변경',
          adminNotes: '과도한 최소 주문 수량 요구로 거절',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          reviewedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
          reviewedBy: 'Admin',
          legalCompliance: {
            msrpCompliant: false,
            fairTradeCompliant: false,
            notes: '과도한 최소 주문량은 시장 진입 장벽이 될 수 있음'
          }
        }
      ];

      // Filter by status
      let filteredRequests = [...mockRequests];
      if (status === 'pending') {
        filteredRequests = filteredRequests.filter(r => r.status === 'pending');
      } else if (status === 'processed') {
        filteredRequests = filteredRequests.filter(r => r.status !== 'pending');
      }

      // Apply pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      
      const paginatedRequests = filteredRequests.slice(start, end);

      res.json({
        success: true,
        requests: paginatedRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredRequests.length,
          pages: Math.ceil(filteredRequests.length / limitNum)
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
      if (req.user?.role !== 'admin' && req.user?.role !== 'administrator') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // In production, this would update the actual approval request
      // For now, we'll just log it
      const approvalLogRepository = getRepository(ApprovalLog);
      const log = approvalLogRepository.create({
        requestId: id,
        action: 'approved',
        performedBy: adminId?.toString() || 'system',
        performedAt: new Date(),
        notes: adminNotes,
        metadata: {
          adminName,
          timestamp: new Date().toISOString()
        }
      });

      await approvalLogRepository.save(log);

      // Send notification to requester (mock)
      console.log(`Approval notification sent for request ${id}`);

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
      if (req.user?.role !== 'admin' && req.user?.role !== 'administrator') {
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

      // In production, this would update the actual approval request
      const approvalLogRepository = getRepository(ApprovalLog);
      const log = approvalLogRepository.create({
        requestId: id,
        action: 'rejected',
        performedBy: adminId?.toString() || 'system',
        performedAt: new Date(),
        notes: reason,
        metadata: {
          adminName,
          timestamp: new Date().toISOString()
        }
      });

      await approvalLogRepository.save(log);

      // Send notification to requester (mock)
      console.log(`Rejection notification sent for request ${id}`);

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
      if (req.user?.role !== 'admin' && req.user?.role !== 'administrator') {
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
      if (req.user?.role !== 'admin' && req.user?.role !== 'administrator') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Mock detailed request data
      const requestDetails = {
        id: id,
        type: 'pricing',
        entityType: 'product',
        entityId: 'prod_123',
        entityName: 'Premium Widget Pro',
        requesterId: 'user_456',
        requesterName: '김공급',
        requesterRole: 'supplier',
        requesterEmail: 'supplier@example.com',
        status: 'pending',
        priority: 'high',
        changes: {
          cost_price: 150000,
          msrp: 299000,
          supplier_commission: 12
        },
        currentValues: {
          cost_price: 120000,
          msrp: 250000,
          supplier_commission: 10
        },
        reason: '원자재 가격 상승으로 인한 조정',
        supportingDocuments: [
          {
            name: 'cost_analysis.pdf',
            url: '/documents/cost_analysis.pdf',
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        legalCompliance: {
          msrpCompliant: true,
          fairTradeCompliant: true,
          priceStabilityCheck: true,
          marketImpactAssessment: 'low',
          notes: 'MSRP는 권장가격으로 표시되며 판매자 자율권 보장. 시장 영향도 낮음.'
        },
        history: [
          {
            action: 'created',
            performedBy: '김공급',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            notes: '가격 조정 요청 제출'
          },
          {
            action: 'reviewed',
            performedBy: 'System',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            notes: '자동 법률 준수 검토 완료'
          }
        ],
        impactAnalysis: {
          affectedProducts: 3,
          affectedSellers: 15,
          estimatedRevenueImpact: '+5.2%',
          competitorPriceComparison: {
            average: 280000,
            min: 250000,
            max: 320000
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