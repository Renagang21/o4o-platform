import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Settings, GeneralSettings, ReadingSettings, ThemeSettings, EmailSettings, PermalinkSettings } from '../entities/Settings.js';
import { TemplatePart } from '../entities/TemplatePart.js';
import { AccessControlSettings } from '@o4o/types';
import { convertSettingsToHeaderTemplatePart, convertSettingsToFooterTemplatePart } from '../utils/customizer/template-parts-converter.js';
import logger from '../utils/logger.js';

export type SettingsType = 'general' | 'reading' | 'theme' | 'email' | 'permalink' | 'customizer';
export type SettingsValue = GeneralSettings | ReadingSettings | ThemeSettings | EmailSettings | PermalinkSettings | AccessControlSettings | Record<string, unknown>;

export class SettingsService {
  private settingsRepository: Repository<Settings>;
  private templatePartRepository: Repository<TemplatePart>;

  constructor() {
    this.settingsRepository = AppDataSource.getRepository(Settings);
    this.templatePartRepository = AppDataSource.getRepository(TemplatePart);
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

    // SIMPLIFIED: Template parts sync removed for now
    // Users can manually sync via a separate endpoint if needed
    // This prevents save failures due to template conversion errors
    logger.info(`Settings saved successfully: ${type}`);

    return setting.value;
  }

  /**
   * Sync template parts from customizer settings
   * This creates/updates header and footer template parts based on Header/Footer Builder settings
   */
  private async syncTemplatePartsFromCustomizer(customizerSettings: SettingsValue): Promise<void> {
    logger.info('[DEBUG] Syncing template parts from customizer settings...');
    logger.info('[DEBUG] customizerSettings type:', typeof customizerSettings);
    logger.info('[DEBUG] customizerSettings keys:', Object.keys(customizerSettings || {}));
    logger.info('[DEBUG] siteIdentity.logo:', JSON.stringify((customizerSettings as any)?.siteIdentity?.logo));

    // Convert settings to template parts
    try {
      logger.info('[DEBUG] Converting header template part...');
      const headerData = convertSettingsToHeaderTemplatePart(customizerSettings);
      logger.info('[DEBUG] Header data created successfully');

      logger.info('[DEBUG] Converting footer template part...');
      const footerData = convertSettingsToFooterTemplatePart(customizerSettings);
      logger.info('[DEBUG] Footer data created successfully');

      // Update or create header template part
      logger.info('[DEBUG] Upserting header template part...');
      await this.upsertTemplatePart(headerData);
      logger.info('[DEBUG] Header template part upserted');

      // Update or create footer template part
      logger.info('[DEBUG] Upserting footer template part...');
      await this.upsertTemplatePart(footerData);
      logger.info('[DEBUG] Footer template part upserted');

      logger.info('[DEBUG] Template parts synced successfully');
    } catch (error) {
      logger.error('[DEBUG] Error in syncTemplatePartsFromCustomizer:', error);
      logger.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Create or update a template part
   */
  private async upsertTemplatePart(data: any): Promise<void> {
    // Find existing template part by slug
    let templatePart = await this.templatePartRepository.findOne({
      where: { slug: data.slug }
    });

    if (templatePart) {
      // Update existing
      templatePart.name = data.name;
      templatePart.description = data.description;
      templatePart.content = data.content;
      templatePart.settings = data.settings;
      templatePart.isActive = data.isActive ?? true;
      templatePart.isDefault = data.isDefault ?? true;
      templatePart.priority = data.priority ?? 10;
      templatePart.tags = data.tags ?? null; // Update tags field (null for simple-array)
    } else {
      // Create new
      templatePart = this.templatePartRepository.create({
        name: data.name,
        slug: data.slug,
        description: data.description,
        area: data.area,
        content: data.content,
        settings: data.settings,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? true,
        priority: data.priority ?? 10,
        tags: data.tags ?? null // Use null for simple-array type
      });
    }

    await this.templatePartRepository.save(templatePart);
    logger.info(`Template part ${data.slug} saved successfully`);
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
          defaultUserRole: process.env.DEFAULT_USER_ROLE || 'user',
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

  /**
   * Get Header Builder settings
   */
  async getHeaderBuilder(): Promise<Record<string, unknown>> {
    const setting = await this.settingsRepository.findOne({
      where: { key: 'headerBuilder' }
    });

    if (!setting) {
      // Return default header builder layout
      return {
        builder: this.getDefaultHeaderBuilderLayout(),
        sticky: this.getDefaultStickySettings(),
        mobile: this.getDefaultMobileSettings(),
      };
    }

    return setting.value as Record<string, unknown>;
  }

  /**
   * Update Header Builder settings
   */
  async updateHeaderBuilder(value: Record<string, unknown>): Promise<Record<string, unknown>> {
    let setting = await this.settingsRepository.findOne({
      where: { key: 'headerBuilder' }
    });

    if (!setting) {
      setting = this.settingsRepository.create({
        key: 'headerBuilder',
        type: 'headerBuilder' as any,
        value: value
      });
    } else {
      setting.value = value;
    }

    await this.settingsRepository.save(setting);
    logger.info('Header Builder settings saved successfully');

    // Sync Header Builder to Template Parts
    try {
      await this.syncTemplatePartsFromHeaderBuilder(value);
      logger.info('Template parts synced from Header Builder successfully');
    } catch (error) {
      logger.error('Failed to sync template parts from Header Builder:', error);
      // Don't fail the save operation, just log the error
    }

    return setting.value as Record<string, unknown>;
  }

  /**
   * Sync Template Parts from Header Builder settings
   * Converts Header Builder data to Template Part blocks
   */
  private async syncTemplatePartsFromHeaderBuilder(headerBuilderData: Record<string, unknown>): Promise<void> {
    const builder = headerBuilderData.builder as any;
    if (!builder) {
      logger.warn('No builder data found in Header Builder settings');
      return;
    }

    // Delete old header-main template part (legacy slug)
    try {
      const oldTemplatePart = await this.templatePartRepository.findOne({
        where: { slug: 'header-main' }
      });
      if (oldTemplatePart) {
        await this.templatePartRepository.remove(oldTemplatePart);
        logger.info('Old header-main template part deleted');
      }
    } catch (error) {
      logger.error('Error deleting old header-main:', error);
      // Continue anyway
    }

    // Convert Header Builder modules to Template Part blocks
    const content: any[] = [];

    // Helper function to convert module type to block type
    const getBlockType = (moduleType: string): string => {
      const typeMap: Record<string, string> = {
        'logo': 'core/site-logo',
        'site-title': 'core/site-title',
        'primary-menu': 'core/navigation',
        'secondary-menu': 'core/navigation',
        'search': 'core/search',
        'account': 'o4o/account-menu',
        'cart': 'o4o/cart-icon',
        'role-switcher': 'o4o/role-switcher',
        'button': 'o4o/button',
        'html': 'o4o/html',
        'widget': 'core/widget-area',
        'social': 'core/social-links',
      };
      return typeMap[moduleType] || moduleType;
    };

    // Helper function to convert module to block
    const convertModuleToBlock = (module: any, rowName: string): any => {
      const blockType = getBlockType(module.type);

      // Build module-specific data
      let moduleData: any = {
        className: module.settings?.customClass || '',
      };

      // Add module-specific settings to data
      if (module.type === 'logo') {
        moduleData = {
          ...moduleData,
          logoUrl: module.settings?.logoUrl || '',
          href: module.settings?.href || '/',
          width: module.settings?.width || 120,
          retinaUrl: module.settings?.retinaUrl || '',
          isLink: module.settings?.isLink !== false,
        };
      } else if (module.type === 'primary-menu' || module.type === 'secondary-menu') {
        moduleData = {
          ...moduleData,
          menuRef: module.type === 'primary-menu' ? 'primary' : 'secondary',
          orientation: 'horizontal',
          showSubmenuIcon: true,
        };
      } else if (module.type === 'site-title') {
        moduleData = {
          ...moduleData,
          text: module.settings?.text || '',
          tagline: module.settings?.tagline || '',
          showTitle: module.settings?.showTitle !== false,
          showTagline: module.settings?.showTagline || false,
          isLink: module.settings?.isLink !== false,
          href: module.settings?.href || '/',
        };
      } else if (module.type === 'button') {
        moduleData = {
          ...moduleData,
          label: module.settings?.label || 'Button',
          href: module.settings?.href || '#',
          variant: module.settings?.variant || 'primary',
          size: module.settings?.size || 'medium',
        };
      } else if (module.type === 'html') {
        moduleData = {
          ...moduleData,
          html: module.settings?.html || '',
        };
      } else if (module.type === 'social') {
        moduleData = {
          ...moduleData,
          links: module.settings?.links || [],
          shape: module.settings?.shape || 'circle',
          size: module.settings?.size || 24,
        };
      } else if (module.type === 'account') {
        moduleData = {
          ...moduleData,
          accountUrl: module.settings?.accountUrl || '/account',
          showIcon: module.settings?.showIcon !== false,
          showLabel: module.settings?.showLabel !== false,
          label: module.settings?.label || 'Account',
        };
      } else if (module.type === 'cart') {
        moduleData = {
          ...moduleData,
          showCount: module.settings?.showCount !== false,
          showTotal: module.settings?.showTotal || false,
          action: module.settings?.action || 'mini-cart',
          cartUrl: module.settings?.cartUrl || '/cart',
        };
      }

      return {
        id: module.id,
        type: blockType,
        data: moduleData,
        settings: {
          visibility: module.settings?.visibility || { desktop: true, tablet: true, mobile: true },
          alignment: module.settings?.alignment || 'left',
          spacing: module.settings?.spacing || {},
        },
        attributes: {},
        innerBlocks: []
      };
    };

    // Process each row (above, primary, below)
    for (const rowName of ['above', 'primary', 'below']) {
      const row = builder[rowName];
      if (!row) continue;

      // Skip disabled rows
      if (rowName !== 'primary' && row.settings?.enabled === false) {
        continue;
      }

      // Create a group for the row with 3 columns
      const rowGroup: any = {
        id: `header-${rowName}-row`,
        type: 'o4o/group',
        data: {
          className: `header-${rowName}-row`,
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        settings: {
          backgroundColor: row.settings?.background || '#ffffff',
          padding: row.settings?.padding || { top: 10, bottom: 10, left: 20, right: 20 },
        },
        attributes: {},
        innerBlocks: []
      };

      // Add columns (left, center, right)
      for (const position of ['left', 'center', 'right']) {
        const modules = row[position] || [];

        const columnGroup: any = {
          id: `header-${rowName}-${position}`,
          type: 'o4o/group',
          data: {
            className: `header-${rowName}-${position}`,
            layout: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
          },
          attributes: {},
          innerBlocks: modules.map((module: any) => convertModuleToBlock(module, rowName))
        };

        rowGroup.innerBlocks.push(columnGroup);
      }

      content.push(rowGroup);
    }

    // Create or update header template part
    const headerTemplatePart = {
      name: 'Main Header',
      slug: 'main-header',
      description: 'Main site header generated from Header Builder',
      area: 'header',
      content: content,
      settings: {
        containerWidth: 'wide',
        backgroundColor: builder.primary?.settings?.background || '#ffffff',
        padding: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      isActive: true,
      isDefault: true,
      priority: 0, // Changed from 10 to 0 (highest priority)
      tags: null, // Use null for simple-array type (nullable column)
    };

    await this.upsertTemplatePart(headerTemplatePart);
    logger.info('Header template part synced successfully');
  }

  /**
   * Default Header Builder Layout
   */
  private getDefaultHeaderBuilderLayout() {
    return {
      above: {
        left: [],
        center: [],
        right: [],
        settings: {
          enabled: false,
          height: { desktop: 40, tablet: 40, mobile: 40 },
          background: '#f8f9fa',
        }
      },
      primary: {
        left: [
          {
            id: 'logo-1',
            type: 'logo',
            label: 'Logo',
            settings: {
              visibility: { desktop: true, tablet: true, mobile: true }
            }
          }
        ],
        center: [],
        right: [
          {
            id: 'menu-1',
            type: 'primary-menu',
            label: 'Primary Menu',
            settings: {
              visibility: { desktop: true, tablet: true, mobile: true }
            }
          }
        ],
        settings: {
          height: { desktop: 70, tablet: 60, mobile: 60 },
          background: '#ffffff',
        }
      },
      below: {
        left: [],
        center: [],
        right: [],
        settings: {
          enabled: false,
          height: { desktop: 40, tablet: 40, mobile: 40 },
          background: '#f8f9fa',
        }
      }
    };
  }

  /**
   * Default Sticky Header Settings
   */
  private getDefaultStickySettings() {
    return {
      enabled: false,
      triggerHeight: 100,
      stickyOn: ['primary'],
      shrinkEffect: false,
      shrinkHeight: { desktop: 60, tablet: 50, mobile: 50 },
      backgroundOpacity: 0.95,
      boxShadow: true,
      shadowIntensity: 'medium',
      animationDuration: 300,
      hideOnScrollDown: false,
      zIndex: 1000,
    };
  }

  /**
   * Default Mobile Header Settings
   */
  private getDefaultMobileSettings() {
    return {
      enabled: true,
      breakpoint: 768,
      hamburgerStyle: 'default',
      menuPosition: 'left',
      menuAnimation: 'slide',
      overlayEnabled: true,
      overlayOpacity: 0.5,
      submenuStyle: 'accordion',
      closeOnItemClick: true,
      swipeToClose: true,
    };
  }

  /**
   * Delete customizer settings (cleanup legacy Astra data)
   */
  async deleteCustomizerSettings(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.settingsRepository.delete({ key: 'customizer' });

      if (result.affected && result.affected > 0) {
        logger.info('Customizer settings deleted successfully');
        return {
          success: true,
          message: `Customizer settings deleted (${result.affected} row(s) affected)`
        };
      } else {
        logger.info('No customizer settings found to delete');
        return {
          success: true,
          message: 'No customizer settings found to delete'
        };
      }
    } catch (error) {
      logger.error('Error deleting customizer settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();