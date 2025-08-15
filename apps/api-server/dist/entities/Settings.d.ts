export declare class Settings {
    key: string;
    value: GeneralSettings | ReadingSettings | ThemeSettings | EmailSettings | Record<string, unknown> | null;
    type: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface GeneralSettings {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowRegistration: boolean;
    defaultUserRole: string;
    requireEmailVerification: boolean;
    enableApiAccess: boolean;
    apiRateLimit: number;
}
export interface ReadingSettings {
    homepageType: 'latest_posts' | 'static_page';
    homepageId?: string;
    postsPerPage: number;
    showSummary: 'full' | 'excerpt';
    excerptLength: number;
}
export interface ThemeSettings {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: string;
    darkMode: boolean;
}
export interface EmailSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
}
//# sourceMappingURL=Settings.d.ts.map