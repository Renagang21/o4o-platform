import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Settings, GeneralSettings, ReadingSettings, ThemeSettings, EmailSettings, PermalinkSettings } from '../entities/Settings';

export type SettingsType = 'general' | 'reading' | 'theme' | 'email' | 'permalink' | 'customizer';
export type SettingsValue = GeneralSettings | ReadingSettings | ThemeSettings | EmailSettings | PermalinkSettings | Record<string, unknown>;

export class SettingsService {
  private settingsRepository: Repository<Settings>;

  constructor() {
    this.settingsRepository = AppDataSource.getRepository(Settings);
  }

  // Get settings by type
  async getSettings(type: SettingsType): Promise<SettingsValue> {
    const setting = await this.settingsRepository.findOne({
      where: { key: type }
    });

    if (!setting) {
      // Return default settings based on type
      return this.getDefaultSettings(type);
    }

    return setting.value;
  }

  // Update settings
  async updateSettings(type: SettingsType, value: SettingsValue): Promise<SettingsValue> {
    let setting = await this.settingsRepository.findOne({
      where: { key: type }
    });

    if (!setting) {
      setting = this.settingsRepository.create({
        key: type,
        type: type,
        value: value
      });
    } else {
      setting.value = value;
    }

    await this.settingsRepository.save(setting);
    return setting.value;
  }

  // Get specific setting value
  async getSettingValue(type: SettingsType, key: string): Promise<unknown> {
    const settings = await this.getSettings(type);
    return (settings as Record<string, unknown>)?.[key];
  }

  // Update specific setting value
  async updateSettingValue(type: SettingsType, key: string, value: unknown): Promise<SettingsValue> {
    const settings = await this.getSettings(type) || {};
    (settings as Record<string, unknown>)[key] = value;
    return await this.updateSettings(type, settings);
  }

  // Get default settings based on type
  private getDefaultSettings(type: SettingsType): SettingsValue {
    switch (type) {
      case 'general':
        return {
          siteName: process.env.DEFAULT_SITE_NAME || 'O4O Platform',
          siteDescription: process.env.DEFAULT_SITE_DESCRIPTION || 'Multi-tenant e-commerce platform',
          siteUrl: process.env.DEFAULT_SITE_URL || '',
          adminEmail: process.env.DEFAULT_ADMIN_EMAIL || '',
          timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Seoul',
          dateFormat: process.env.DEFAULT_DATE_FORMAT || 'YYYY-MM-DD',
          timeFormat: process.env.DEFAULT_TIME_FORMAT || 'HH:mm',
          language: process.env.DEFAULT_LANGUAGE || 'ko',
          maintenanceMode: process.env.DEFAULT_MAINTENANCE_MODE === 'true' || false,
          maintenanceMessage: process.env.DEFAULT_MAINTENANCE_MESSAGE || '',
          allowRegistration: process.env.DEFAULT_ALLOW_REGISTRATION !== 'false',
          defaultUserRole: process.env.DEFAULT_USER_ROLE || 'customer',
          requireEmailVerification: process.env.DEFAULT_REQUIRE_EMAIL_VERIFICATION !== 'false',
          enableApiAccess: process.env.DEFAULT_ENABLE_API_ACCESS === 'true' || false,
          apiRateLimit: parseInt(process.env.DEFAULT_API_RATE_LIMIT || '100', 10)
        } as GeneralSettings;

      case 'reading':
        return {
          homepageType: (process.env.DEFAULT_HOMEPAGE_TYPE as 'latest_posts' | 'static_page') || 'latest_posts',
          homepageId: process.env.DEFAULT_HOMEPAGE_ID || undefined,
          postsPerPage: parseInt(process.env.DEFAULT_POSTS_PER_PAGE || '10', 10),
          showSummary: (process.env.DEFAULT_SHOW_SUMMARY as 'full' | 'excerpt') || 'excerpt',
          excerptLength: parseInt(process.env.DEFAULT_EXCERPT_LENGTH || '200', 10)
        } as ReadingSettings;

      case 'theme':
        return {
          theme: process.env.DEFAULT_THEME || 'default',
          primaryColor: process.env.DEFAULT_PRIMARY_COLOR || '#0066cc',
          secondaryColor: process.env.DEFAULT_SECONDARY_COLOR || '#666666',
          fontFamily: process.env.DEFAULT_FONT_FAMILY || 'system-ui',
          fontSize: process.env.DEFAULT_FONT_SIZE || '16px',
          darkMode: process.env.DEFAULT_DARK_MODE === 'true' || false
        } as ThemeSettings;

      case 'email':
        return {
          smtpHost: process.env.SMTP_HOST || '',
          smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
          smtpUser: process.env.SMTP_USER || '',
          smtpPassword: process.env.SMTP_PASSWORD || '',
          smtpSecure: process.env.SMTP_SECURE === 'true' || false,
          fromEmail: process.env.SMTP_FROM_EMAIL || '',
          fromName: process.env.SMTP_FROM_NAME || ''
        } as EmailSettings;

      default:
        return {};
    }
  }

  // Initialize default settings if not exists
  async initializeSettings(): Promise<void> {
    const types: SettingsType[] = ['general', 'reading', 'theme', 'email'];
    
    for (const type of types) {
      const exists = await this.settingsRepository.findOne({
        where: { key: type }
      });

      if (!exists) {
        const defaultSettings = this.getDefaultSettings(type);
        await this.settingsRepository.save({
          key: type,
          type: type,
          value: defaultSettings
        });
      }
    }
  }

  // Get homepage settings for frontend
  async getHomepageSettings(): Promise<{
    type: 'latest_posts' | 'static_page';
    pageId?: string;
    postsPerPage: number;
  }> {
    const readingSettings = await this.getSettings('reading') as ReadingSettings;
    
    return {
      type: readingSettings.homepageType,
      pageId: readingSettings.homepageId,
      postsPerPage: readingSettings.postsPerPage
    };
  }
}

export const settingsService = new SettingsService();