import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class MenuWidgetController {
    private menuRepository;
    private widgets;
    private widgetIdCounter;
    constructor();
    /**
     * GET /api/v1/menu-widgets
     * Get all menu widgets
     */
    getMenuWidgets(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/menu-widgets
     * Create a new menu widget
     */
    createMenuWidget(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menu-widgets/:id
     * Get a specific menu widget
     */
    getMenuWidget(req: AuthRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/menu-widgets/:id
     * Update a menu widget
     */
    updateMenuWidget(req: AuthRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/menu-widgets/:id
     * Delete a menu widget
     */
    deleteMenuWidget(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/menu-widgets/:id/render
     * Render a menu widget (get HTML)
     */
    renderMenuWidget(req: AuthRequest, res: Response): Promise<void>;
    private initializeDefaultWidgets;
    private checkWidgetConditions;
    private renderWidget;
    private renderNavigationWidget;
    private renderBreadcrumbWidget;
    private renderSitemapWidget;
    private renderFooterWidget;
    private renderMobileWidget;
    private processTemplate;
}
//# sourceMappingURL=MenuWidgetController.d.ts.map