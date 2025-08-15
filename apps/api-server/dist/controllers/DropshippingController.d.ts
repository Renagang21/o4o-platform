/**
 * Dropshipping Configuration Controller
 * 드랍쉬핑 설정 관리 API
 */
import { Request, Response } from 'express';
export declare class DropshippingController {
    private supplierInfoRepository;
    private productRepository;
    private vendorInfoRepository;
    /**
     * Get dropshipping settings
     */
    getSettings(req: Request, res: Response): Promise<void>;
    /**
     * Update dropshipping settings
     */
    updateSettings(req: Request, res: Response): Promise<void>;
    /**
     * Get supplier connectors status
     */
    getConnectors(req: Request, res: Response): Promise<void>;
    /**
     * Test supplier connector
     */
    testConnector(req: Request, res: Response): Promise<void>;
    /**
     * Get margin policies
     */
    getMarginPolicies(req: Request, res: Response): Promise<void>;
    /**
     * Get dropshipping statistics
     */
    getStatistics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=DropshippingController.d.ts.map