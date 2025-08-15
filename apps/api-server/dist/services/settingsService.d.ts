import { GeneralSettings, ReadingSettings, ThemeSettings, EmailSettings } from '../entities/Settings';
export type SettingsType = 'general' | 'reading' | 'theme' | 'email';
export type SettingsValue = GeneralSettings | ReadingSettings | ThemeSettings | EmailSettings | Record<string, unknown>;
export declare class SettingsService {
    private settingsRepository;
    constructor();
    getSettings(type: SettingsType): Promise<SettingsValue>;
    updateSettings(type: SettingsType, value: SettingsValue): Promise<SettingsValue>;
    getSettingValue(type: SettingsType, key: string): Promise<unknown>;
    updateSettingValue(type: SettingsType, key: string, value: unknown): Promise<SettingsValue>;
    private getDefaultSettings;
    initializeSettings(): Promise<void>;
    getHomepageSettings(): Promise<{
        type: 'latest_posts' | 'static_page';
        pageId?: string;
        postsPerPage: number;
    }>;
}
export declare const settingsService: SettingsService;
//# sourceMappingURL=settingsService.d.ts.map