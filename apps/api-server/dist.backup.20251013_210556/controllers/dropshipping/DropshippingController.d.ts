import { Request, Response } from 'express';
export declare class DropshippingController {
    getCommissionPolicies: (req: Request, res: Response) => Promise<void>;
    getApprovals: (req: Request, res: Response) => Promise<void>;
    approveRequest: (req: Request, res: Response) => Promise<void>;
    rejectRequest: (req: Request, res: Response) => Promise<void>;
    getSystemStatus: (req: Request, res: Response) => Promise<void>;
    initializeSystem: (req: Request, res: Response) => Promise<void>;
    createSampleData: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=DropshippingController.d.ts.map