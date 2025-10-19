import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class MenuAnalyticsController {
    private menuRepository;
    private menuItemRepository;
    private clickEvents;
    private performanceMetrics;
    constructor();
    /**
     * GET /api/v1/menus/:id/analytics
     * Get menu click analytics
     */
    getMenuAnalytics(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menus/:id/performance
     * Get menu performance metrics
     */
    getMenuPerformance(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/menus/:id/track-click
     * Track menu item click (internal use)
     */
    trackMenuClick(req: Request, res: Response): Promise<void>;
    private calculateAnalytics;
    private calculatePerformance;
    /**
     * Record render time for performance tracking
     */
    recordRenderTime(menuId: string, time: number): void;
}
//# sourceMappingURL=MenuAnalyticsController.d.ts.map