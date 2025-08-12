import { Theme, ThemeInstallation } from '../entities/Theme';
export interface ThemeManifest {
    name: string;
    version: string;
    description?: string;
    author?: string;
    authorUrl?: string;
    screenshot?: string;
    demoUrl?: string;
    requiredPlugins?: string[];
    supportedLanguages?: string[];
    license?: string;
    templateFiles?: {
        name: string;
        path: string;
        type: 'template' | 'partial' | 'widget';
    }[];
    colorSchemes?: any[];
    layoutOptions?: any;
    typography?: any;
}
export declare class ThemeService {
    private themeRepository;
    private installationRepository;
    private themesDir;
    private activeTheme;
    constructor();
    /**
     * Get all available themes
     */
    getAllThemes(): Promise<Theme[]>;
    /**
     * Get theme by ID
     */
    getThemeById(id: string): Promise<Theme | null>;
    /**
     * Get theme by slug
     */
    getThemeBySlug(slug: string): Promise<Theme | null>;
    /**
     * Install theme from marketplace
     */
    installTheme(themeUrl: string, siteId: string): Promise<ThemeInstallation>;
    /**
     * Activate theme
     */
    activateTheme(themeId: string, siteId: string): Promise<void>;
    /**
     * Deactivate theme
     */
    deactivateTheme(themeId: string, siteId: string): Promise<void>;
    /**
     * Uninstall theme
     */
    uninstallTheme(themeId: string, siteId: string): Promise<void>;
    /**
     * Update theme
     */
    updateTheme(themeId: string, updateUrl: string): Promise<Theme>;
    /**
     * Get theme preview data
     */
    getThemePreview(themeId: string): Promise<any>;
    /**
     * Save theme customizations
     */
    saveCustomizations(themeId: string, siteId: string, customizations: any): Promise<void>;
    /**
     * Get active theme
     */
    getActiveTheme(siteId: string): Promise<Theme | null>;
    /**
     * Search themes in marketplace
     */
    searchMarketplace(query: string, filters?: any): Promise<Theme[]>;
    /**
     * Helper: Get theme styles
     */
    private getThemeStyles;
    /**
     * Helper: Get theme scripts
     */
    private getThemeScripts;
    /**
     * Helper: Copy directory
     */
    private copyDirectory;
}
//# sourceMappingURL=ThemeService.d.ts.map