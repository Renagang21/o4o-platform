import { Request, Response } from 'express';
export declare class ThemeController {
    private themeService;
    constructor();
    /**
     * Get all themes
     */
    getAllThemes: (req: Request, res: Response) => Promise<void>;
    /**
     * Get theme by ID
     */
    getThemeById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Install theme from marketplace
     */
    installTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Upload and install theme
     */
    uploadTheme: any[];
    /**
     * Activate theme
     */
    activateTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Deactivate theme
     */
    deactivateTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Uninstall theme
     */
    uninstallTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Update theme
     */
    updateTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Get theme preview
     */
    getThemePreview: (req: Request, res: Response) => Promise<void>;
    /**
     * Save theme customizations
     */
    saveCustomizations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Get active theme
     */
    getActiveTheme: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Search marketplace
     */
    searchMarketplace: (req: Request, res: Response) => Promise<void>;
    /**
     * Execute hook (for testing)
     */
    executeHook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ThemeController.d.ts.map