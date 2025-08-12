/**
 * Export Controller
 * 정산 및 분석용 데이터 추출 기능
 */
import { Request, Response } from 'express';
export declare class ExportController {
    private orderRepository;
    private orderItemRepository;
    private productRepository;
    private userRepository;
    private vendorOrderItemRepository;
    /**
     * Export transactions to CSV
     * GET /api/export/transactions?startDate=2024-01-01&endDate=2024-12-31&format=csv
     */
    exportTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Export sales summary
     * GET /api/export/sales-summary?startDate=2024-01-01&endDate=2024-12-31
     */
    exportSalesSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Export vendor settlements
     * GET /api/export/vendor-settlements?month=2024-01
     */
    exportVendorSettlements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Export product inventory
     * GET /api/export/inventory
     */
    exportInventory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Export affiliate commissions
     * GET /api/export/affiliate-commissions?month=2024-01
     */
    exportAffiliateCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Helper: Export to CSV
     */
    private exportToCSV;
    /**
     * Helper: Export to Excel
     */
    private exportToExcel;
}
//# sourceMappingURL=ExportController.d.ts.map