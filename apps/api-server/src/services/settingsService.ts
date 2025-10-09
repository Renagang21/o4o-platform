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
          siteName: 'O4O Platform',
          siteDescription: 'Multi-tenant e-commerce platform',
          siteUrl: '',
          adminEmail: '',
          timezone: 'Asia/Seoul',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm',
          language: 'ko',
          maintenanceMode: false,
          maintenanceMessage: '',
          allowRegistration: true,
          defaultUserRole: 'customer',
          requireEmailVerification: true,
          enableApiAccess: false,
          apiRateLimit: 100
        } as GeneralSettings;

      case 'reading':
        return {
          homepageType: 'latest_posts',
          homepageId: undefined,
          postsPerPage: 10,
          showSummary: 'excerpt',
          excerptLength: 200
        } as ReadingSettings;

      case 'theme':
        return {
          theme: 'default',
          primaryColor: '#0066cc',
          secondaryColor: '#666666',
          fontFamily: 'system-ui',
          fontSize: '16px',
          darkMode: false
        } as ThemeSettings;

      case 'email':
        return {
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          smtpSecure: false,
          fromEmail: '',
          fromName: ''
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