import { Request, Response } from 'express';
export declare class AdminSupplierController {
    getSuppliers: (req: Request, res: Response) => Promise<void>;
    getSupplier: (req: Request, res: Response) => Promise<void>;
    createSupplier: (req: Request, res: Response) => Promise<void>;
    updateSupplier: (req: Request, res: Response) => Promise<void>;
    updateSupplierStatus: (req: Request, res: Response) => Promise<void>;
    approveSupplier: (req: Request, res: Response) => Promise<void>;
    deleteSupplier: (req: Request, res: Response) => Promise<void>;
    getSupplierStatistics: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=AdminSupplierController.d.ts.map