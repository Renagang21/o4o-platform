import { User } from './User';
export declare class Theme {
    id: string;
    slug: string;
    name: string;
    description?: string;
    version: string;
    author?: string;
    authorUrl?: string;
    screenshot?: string;
    demoUrl?: string;
    type: 'builtin' | 'external' | 'custom';
    status: 'active' | 'inactive' | 'maintenance';
    isPremium: boolean;
    price?: number;
    features?: string[];
    requiredPlugins?: string[];
    colorSchemes?: {
        name: string;
        colors: {
            primary?: string;
            secondary?: string;
            accent?: string;
            background?: string;
            text?: string;
        };
    }[];
    layoutOptions?: {
        containerWidth?: string;
        sidebarPosition?: 'left' | 'right' | 'none';
        headerLayout?: 'default' | 'centered' | 'transparent';
        footerLayout?: 'default' | 'minimal' | 'extended';
    };
    typography?: {
        fontFamily?: string;
        fontSize?: string;
        lineHeight?: string;
        headingFont?: string;
    };
    customCss?: string;
    customJs?: string;
    templateFiles?: {
        name: string;
        path: string;
        type: 'template' | 'partial' | 'widget';
        content?: string;
    }[];
    downloads: number;
    rating: number;
    reviewCount: number;
    lastUpdate?: Date;
    changelog?: {
        version: string;
        date: Date;
        changes: string[];
    }[];
    license?: string;
    supportedLanguages?: string[];
    isChildTheme: boolean;
    parentThemeId?: string;
    uploadedBy?: User;
    uploadedById?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ThemeInstallation {
    id: string;
    themeId: string;
    siteId: string;
    status: 'installed' | 'active' | 'updating' | 'error';
    activatedAt?: Date;
    customizations?: any;
    backupData?: any;
    installedAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Theme.d.ts.map