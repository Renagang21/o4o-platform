import { Request, Response } from 'express';
export declare class ApprovalController {
    /**
     * Create pricing approval request
     * POST /api/v1/approval/pricing
     */
    createPricingApproval(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Process seller autonomous pricing
     * POST /api/v1/approval/autonomous-pricing
     */
    processAutonomousPricing(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Approve pricing request
     * POST /api/v1/approval/approve/:requestId
     */
    approvePricingRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Reject pricing request
     * POST /api/v1/approval/reject/:requestId
     */
    rejectPricingRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get pending approval requests
     * GET /api/v1/approval/pending
     */
    getPendingRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get approval queue
     * GET /api/v1/approval/queue
     */
    getApprovalQueue(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get approval request history
     * GET /api/v1/approval/history/:entityId
     */
    getRequestHistory(req: Request, res: Response): Promise<void>;
    /**
     * Check legal compliance
     * POST /api/v1/approval/check-compliance
     */
    checkCompliance(req: Request, res: Response): Promise<void>;
    /**
     * Get user approval permissions
     * GET /api/v1/approval/permissions
     */
    getUserPermissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=approvalController.d.ts.map