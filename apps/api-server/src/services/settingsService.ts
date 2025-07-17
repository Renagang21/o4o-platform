import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Settings, GeneralSettings, ReadingSettings, ThemeSettings, EmailSettings } from '../entities/Settings';

export class SettingsService {
  private settingsRepository: Repository<Settings>;

  constructor() {
    this.settingsRepository = AppDataSource.getRepository(Settings);
  }

  // Get settings by type
  async getSettings(type: string): Promise<any> {
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
  async updateSettings(type: string, value: any): Promise<any> {
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
  async getSettingValue(type: string, key: string): Promise<any> {
    const settings = await this.getSettings(type);
    return settings?.[key];
  }

  // Update specific setting value
  async updateSettingValue(type: string, key: string, value: any): Promise<any> {
    const settings = await this.getSettings(type) || {};
    settings[key] = value;
    return await this.updateSettings(type, settings);
  }

  // Get default settings based on type
  private getDefaultSettings(type: string): any {
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
    const types = ['general', 'reading', 'theme', 'email'];
    
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