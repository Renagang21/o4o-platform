import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class AdminApprovalController {
    static getApprovalQueue(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveRequest(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static rejectRequest(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getApprovalStats(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getRequestDetails(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=adminApprovalController.d.ts.map