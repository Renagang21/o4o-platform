import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class MenuAdvancedController {
    private menuRepository;
    private menuItemRepository;
    private conditions;
    private styles;
    private megaMenus;
    constructor();
    /**
     * POST /api/v1/menu-items/:id/conditions
     * Create conditions for menu item display
     */
    createMenuItemConditions(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menu-items/:id/conditions
     * Get conditions for menu item
     */
    getMenuItemConditions(req: AuthRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/menu-items/:id/conditions
     * Delete all conditions for menu item
     */
    deleteMenuItemConditions(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/menus/:id/styles
     * Create styles for menu
     */
    createMenuStyles(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menus/:id/styles
     * Get styles for menu
     */
    getMenuStyles(req: AuthRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/menus/:id/styles
     * Update styles for menu
     */
    updateMenuStyles(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/menus/:id/mega-menu
     * Create mega menu configuration
     */
    createMegaMenu(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menus/:id/mega-menu
     * Get mega menu configuration
     */
    getMegaMenu(req: AuthRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/menus/:id/mega-menu
     * Update mega menu configuration
     */
    updateMegaMenu(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Evaluate conditions for menu item visibility
     */
    evaluateConditions(menuItemId: string, context: any): boolean;
    /**
     * Generate CSS from menu styles
     */
    generateCSS(menuId: string): string;
}
//# sourceMappingURL=MenuAdvancedController.d.ts.map