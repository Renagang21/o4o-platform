import { AppDataSource } from '../database/connection.js';
import { Repository } from 'typeorm';
import { User } from '../entities/User.js';
import logger from '../utils/logger.js';

export interface ApprovalRequest {
  id: string;
  entityType: 'ds_product' | 'ds_supplier' | 'ds_partner';
  entityId: string;
  requestType: 'pricing_change' | 'commission_change' | 'supplier_update';
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  changes: Record<string, any>;
  currentValues: Record<string, any>;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export class ApprovalWorkflowService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Create approval request for pricing changes
   */
  async createPricingApprovalRequest(
    entityId: string,
    requestedBy: string,
    changes: {
      cost_price?: number;
      msrp?: number;
      partner_commission_rate?: number;
    },
    currentValues: Record<string, any>
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
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
    
    logger.info(`🚨 Approval request created: ${request.id} for entity ${entityId}`);
    return request;
  }

  /**
   * Process seller autonomous pricing (no approval needed)
   */
  async processSellerAutonomousPricing(
    entityId: string,
    sellerId: string,
    sellerPrice: number,
    metadata?: Record<string, any>
  ): Promise<void> {
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
    
    logger.info(`✅ Autonomous pricing set by seller ${sellerId} for product ${entityId}: ₩${sellerPrice.toLocaleString()}`);
  }

  /**
   * Check if user has approval permissions
   */
  async canApprove(userId: string, requestType: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) return false;

    // Only admins and managers can approve pricing changes
    const adminRoles = ['admin', 'super_admin', 'pricing_manager'];
    return user.roles?.some(role => adminRoles.includes(role)) || false;
  }

  /**
   * Approve pricing request
   */
  async approvePricingRequest(
    requestId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<{ success: boolean; message: string }> {
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

      logger.info(`✅ Pricing request ${requestId} approved by ${approvedBy}`);
      return { success: true, message: 'Request approved successfully' };

    } catch (error) {
      console.error('Error approving request:', error);
      return { success: false, message: 'Error processing approval' };
    }
  }

  /**
   * Reject pricing request
   */
  async rejectPricingRequest(
    requestId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<{ success: boolean; message: string }> {
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

      logger.info(`❌ Pricing request ${requestId} rejected by ${rejectedBy}: ${rejectionReason}`);
      return { success: true, message: 'Request rejected' };

    } catch (error) {
      console.error('Error rejecting request:', error);
      return { success: false, message: 'Error processing rejection' };
    }
  }

  /**
   * Get pending requests for admin review
   */
  async getPendingRequests(filters?: {
    entityType?: string;
    requestType?: string;
    requestedBy?: string;
  }): Promise<ApprovalRequest[]> {
    // Would query from pending approvals table
    return this.queryPendingRequests(filters);
  }

  /**
   * Get request history for an entity
   */
  async getRequestHistory(entityId: string): Promise<ApprovalRequest[]> {
    return this.queryRequestHistory(entityId);
  }

  /**
   * Get approval queue for admin dashboard
   */
  async getApprovalQueue(status: string = 'pending'): Promise<ApprovalRequest[]> {
    // Mock data for testing - replace with actual database query
    const mockRequests: ApprovalRequest[] = [
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
    ] as any;

    // Filter by status if not 'all'
    if (status !== 'all') {
      return mockRequests.filter(req => req.status === status);
    }

    return mockRequests;
  }

  // Private helper methods

  private generateRequestId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storePendingRequest(request: ApprovalRequest): Promise<void> {
    // Implementation would store in database
    // For now, store in memory or file system
    logger.debug('Storing pending request:', request.id);
  }

  private async updatePendingRequest(request: ApprovalRequest): Promise<void> {
    // Implementation would update in database
    logger.debug('Updating pending request:', request.id);
  }

  private async getPendingRequest(requestId: string): Promise<ApprovalRequest | null> {
    // Implementation would query from database
    logger.debug('Getting pending request:', requestId);
    return null; // Placeholder
  }

  private async queryPendingRequests(filters?: any): Promise<ApprovalRequest[]> {
    // Implementation would query from database
    logger.debug('Querying pending requests with filters:', filters);
    return []; // Placeholder
  }

  private async queryRequestHistory(entityId: string): Promise<ApprovalRequest[]> {
    // Implementation would query from database
    logger.debug('Querying request history for:', entityId);
    return []; // Placeholder
  }

  private async applyApprovedChanges(request: ApprovalRequest): Promise<void> {
    // Implementation would apply changes to the actual entity
    logger.debug('Applying approved changes for request:', request.id);
    
    // Update the product/supplier/partner entity with approved values
    // This would use TypeORM to update the actual entity
  }

  private async logAutonomousPricing(logEntry: any): Promise<void> {
    // Implementation would log autonomous pricing changes
    logger.debug('Logging autonomous pricing:', logEntry);
  }

  /**
   * Legal compliance validation
   */
  validateLegalCompliance(changes: Record<string, any>): {
    isCompliant: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

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

export const approvalWorkflowService = new ApprovalWorkflowService();