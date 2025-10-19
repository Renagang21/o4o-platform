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
export declare class ApprovalWorkflowService {
    private userRepository;
    constructor();
    /**
     * Create approval request for pricing changes
     */
    createPricingApprovalRequest(entityId: string, requestedBy: string, changes: {
        cost_price?: number;
        msrp?: number;
        partner_commission_rate?: number;
    }, currentValues: Record<string, any>): Promise<ApprovalRequest>;
    /**
     * Process seller autonomous pricing (no approval needed)
     */
    processSellerAutonomousPricing(entityId: string, sellerId: string, sellerPrice: number, metadata?: Record<string, any>): Promise<void>;
    /**
     * Check if user has approval permissions
     */
    canApprove(userId: string, requestType: string): Promise<boolean>;
    /**
     * Approve pricing request
     */
    approvePricingRequest(requestId: string, approvedBy: string, approvalNotes?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Reject pricing request
     */
    rejectPricingRequest(requestId: string, rejectedBy: string, rejectionReason: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get pending requests for admin review
     */
    getPendingRequests(filters?: {
        entityType?: string;
        requestType?: string;
        requestedBy?: string;
    }): Promise<ApprovalRequest[]>;
    /**
     * Get request history for an entity
     */
    getRequestHistory(entityId: string): Promise<ApprovalRequest[]>;
    /**
     * Get approval queue for admin dashboard
     */
    getApprovalQueue(status?: string): Promise<ApprovalRequest[]>;
    private generateRequestId;
    private storePendingRequest;
    private updatePendingRequest;
    private getPendingRequest;
    private queryPendingRequests;
    private queryRequestHistory;
    private applyApprovedChanges;
    private logAutonomousPricing;
    /**
     * Legal compliance validation
     */
    validateLegalCompliance(changes: Record<string, any>): {
        isCompliant: boolean;
        violations: string[];
        warnings: string[];
    };
}
export declare const approvalWorkflowService: ApprovalWorkflowService;
//# sourceMappingURL=approval-workflow.service.d.ts.map