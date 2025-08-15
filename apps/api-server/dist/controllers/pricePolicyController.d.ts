import { Request, Response } from 'express';
export declare class PricePolicyController {
    private pricePolicyRepository;
    private productRepository;
    private pricingService;
    getPricePolicies: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPricePolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createPricePolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updatePricePolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    deletePricePolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    simulatePrice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getUserPolicies: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getProductPolicies: (req: Request, res: Response) => Promise<void>;
    getPolicyStatistics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    private validatePolicyData;
}
//# sourceMappingURL=pricePolicyController.d.ts.map