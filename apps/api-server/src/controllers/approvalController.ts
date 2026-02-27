import { Request, Response } from 'express';
import { approvalWorkflowService } from '../services/approval-workflow.service.js';

export class ApprovalController {
  
  /**
   * Create pricing approval request
   * POST /api/v1/approval/pricing
   */
  async createPricingApproval(req: Request, res: Response) {
    try {
      const { entityId, changes, currentValues } = req.body;
      const requestedBy = req.user?.id;

      if (!requestedBy) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate legal compliance
      const complianceCheck = approvalWorkflowService.validateLegalCompliance(changes);
      
      if (!complianceCheck.isCompliant) {
        return res.status(400).json({
          success: false,
          message: 'Legal compliance violations detected',
          violations: complianceCheck.violations,
          warnings: complianceCheck.warnings
        });
      }

      const approvalRequest = await approvalWorkflowService.createPricingApprovalRequest(
        entityId,
        requestedBy,
        changes,
        currentValues
      );

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

    } catch (error) {
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
  async processAutonomousPricing(req: Request, res: Response) {
    try {
      const { entityId, sellerPrice, metadata } = req.body;
      const sellerId = req.user?.id;

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify user is a seller
      if (req.user?.roles && !req.user.roles.includes('seller')) {
        return res.status(403).json({
          success: false,
          message: 'Only sellers can set autonomous pricing'
        });
      }

      await approvalWorkflowService.processSellerAutonomousPricing(
        entityId,
        sellerId,
        sellerPrice,
        metadata
      );

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

    } catch (error) {
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
  async approvePricingRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const { adminNotes, approvalNotes } = req.body;
      const approvedBy = req.user?.id;

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await approvalWorkflowService.approvePricingRequest(
        requestId,
        approvedBy,
        adminNotes || approvalNotes
      );

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

    } catch (error) {
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
  async rejectPricingRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const { reason, rejectionReason } = req.body;
      const rejectedBy = req.user?.id;

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

      const result = await approvalWorkflowService.rejectPricingRequest(
        requestId,
        rejectedBy,
        finalReason
      );

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

    } catch (error) {
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
  async getPendingRequests(req: Request, res: Response) {
    try {
      const { entityType, requestType, requestedBy } = req.query;

      // Check if user can view approval requests
      const canView = await approvalWorkflowService.canApprove(
        req.user?.id || '',
        'pricing_change'
      );

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view approval requests'
        });
      }

      const requests = await approvalWorkflowService.getPendingRequests({
        entityType: entityType as string,
        requestType: requestType as string,
        requestedBy: requestedBy as string
      });

      res.status(200).json({
        success: true,
        data: requests,
        count: requests.length
      });

    } catch (error) {
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
  async getApprovalQueue(req: Request, res: Response) {
    try {
      const { status = 'pending' } = req.query;


      const requests = await approvalWorkflowService.getApprovalQueue(status as string);

      res.status(200).json({
        success: true,
        requests: requests,
        count: requests.length
      });

    } catch (error) {
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
  async getRequestHistory(req: Request, res: Response) {
    try {
      const { entityId } = req.params;

      const history = await approvalWorkflowService.getRequestHistory(entityId);

      res.status(200).json({
        success: true,
        data: history,
        count: history.length
      });

    } catch (error) {
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
  async checkCompliance(req: Request, res: Response) {
    try {
      const { changes } = req.body;

      const complianceCheck = approvalWorkflowService.validateLegalCompliance(changes);

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

    } catch (error) {
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
  async getUserPermissions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const canApprovePricing = await approvalWorkflowService.canApprove(userId, 'pricing_change');
      const canApproveCommission = await approvalWorkflowService.canApprove(userId, 'commission_change');

      res.status(200).json({
        success: true,
        data: {
          userId,
          permissions: {
            canApprovePricing,
            canApproveCommission,
            canViewRequests: canApprovePricing || canApproveCommission
          },
          userRoles: req.user?.roles || []
        }
      });

    } catch (error) {
      console.error('Error getting user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}