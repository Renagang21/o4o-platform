import { Request, Response } from 'express';
export declare class DropshippingCPTController {
    getProducts(req: Request, res: Response): Promise<void>;
    createProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    calculateMargin(req: Request, res: Response): Promise<void>;
    getPartners(req: Request, res: Response): Promise<void>;
    createPartner(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePartner(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSuppliers(req: Request, res: Response): Promise<void>;
    createSupplier(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateSupplier(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteSupplier(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deletePartner(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    initializeCPTs(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=DropshippingCPTController.d.ts.map