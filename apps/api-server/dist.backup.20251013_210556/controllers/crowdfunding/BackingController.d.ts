import { Request, Response } from 'express';
export declare class BackingController {
    private backingService;
    constructor();
    createBacking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePaymentStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelBacking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUserBackings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getProjectBackers(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BackingController.d.ts.map