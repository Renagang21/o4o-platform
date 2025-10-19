import { Request, Response } from 'express';
export declare class MigrationController {
    initializeDropshippingSystem(req: Request, res: Response): Promise<void>;
    createSampleData(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    verifySystemStatus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=MigrationController.d.ts.map