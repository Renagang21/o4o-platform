/**
 * Customizer Controller - WordPress-style theme customizer API endpoints
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { AppDataSource } from '../../database/connection';
import { asyncHandler, createValidationError, createNotFoundError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';
import logger from '../../utils/logger';
import dayjs from 'dayjs';

// Entity for customizer settings
interface CustomizerSettings {
  id?: string;
  userId: string;
  themeId: string;
  settings: {
    siteIdentity: {
      logo?: string;
      siteTitle: string;
      tagline: string;
      favicon?: string;
    };
    colors: {
      backgroundColor: string;
      textColor: string;
      linkColor: string;
      accentColor: string;
      headerBackgroundColor: string;
      headerTextColor: string;
      darkMode: boolean;
    };
    menus: {
      primaryMenu?: string;
      footerMenu?: string;
      socialMenu?: string;
    };
    backgroundImage: {
      url?: string;
      preset: string;
      position: string;
      size: string;
      repeat: string;
      attachment: string;
    };
    additionalCss: string;
    homepage: {
      showOnFront: 'posts' | 'page';
      pageOnFront?: string;
      pageForPosts?: string;
    };
  };
  isDraft: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomizerController {
  /**
   * Get current customizer settings
   */
  static getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.query;

    // Try cache first
    const cacheKey = `customizer:${userId}:${themeId}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      logger.info('Customizer settings retrieved from cache', { userId, themeId });
      return res.json(cached);
    }

    // Fetch from database (mock for now)
    const settings: CustomizerSettings = {
      userId: userId!,
      themeId: themeId as string,
      settings: {
        siteIdentity: {
          siteTitle: 'My Website',
          tagline: 'Just another website',
          logo: undefined,
          favicon: undefined
        },
        colors: {
          backgroundColor: '#ffffff',
          textColor: '#333333',
          linkColor: '#0073aa',
          accentColor: '#0073aa',
          headerBackgroundColor: '#23282d',
          headerTextColor: '#ffffff',
          darkMode: false
        },
        menus: {
          primaryMenu: undefined,
          footerMenu: undefined,
          socialMenu: undefined
        },
        backgroundImage: {
          url: undefined,
          preset: 'default',
          position: 'center center',
          size: 'auto',
          repeat: 'repeat',
          attachment: 'scroll'
        },
        additionalCss: '',
        homepage: {
          showOnFront: 'posts',
          pageOnFront: undefined,
          pageForPosts: undefined
        }
      },
      isDraft: false,
      isPublished: true,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, settings, { ttl: 300 });

    logger.info('Customizer settings retrieved', { userId, themeId });
    res.json(settings);
  });

  /**
   * Save customizer settings
   */
  static saveSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.body;
    const settings = req.body;

    // Validate settings
    if (!settings.siteIdentity?.siteTitle) {
      throw createValidationError('Site title is required');
    }

    // Save to database (mock for now)
    const saved: CustomizerSettings = {
      id: `cs_${Date.now()}`,
      userId: userId!,
      themeId,
      settings: settings,
      isDraft: false,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clear cache
    const cacheKey = `customizer:${userId}:${themeId}`;
    await cacheService.delete(cacheKey);

    logger.info('Customizer settings saved', { userId, themeId, settingsId: saved.id });
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: saved
    });
  });

  /**
   * Publish customizer settings
   */
  static publishSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.body;
    const settings = req.body;

    // Validate settings
    if (!settings.siteIdentity?.siteTitle) {
      throw createValidationError('Site title is required');
    }

    // Validate CSS if provided
    if (settings.additionalCss) {
      const cssErrors = validateCSS(settings.additionalCss);
      if (cssErrors.length > 0) {
        throw createValidationError(`CSS validation errors: ${cssErrors.join(', ')}`);
      }
    }

    // Publish settings (mock for now)
    const published: CustomizerSettings = {
      id: `cs_${Date.now()}`,
      userId: userId!,
      themeId,
      settings: settings,
      isDraft: false,
      isPublished: true,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clear all related caches
    const cacheKeys = [
      `customizer:${userId}:${themeId}`,
      `customizer:draft:${userId}:${themeId}`,
      `theme:${themeId}:preview`
    ];
    await Promise.all(cacheKeys.map(key => cacheService.delete(key)));

    // Trigger theme regeneration if needed
    // await ThemeService.regenerateTheme(themeId, published.settings);

    logger.info('Customizer settings published', { 
      userId, 
      themeId, 
      settingsId: published.id,
      publishedAt: published.publishedAt 
    });
    
    res.json({
      success: true,
      message: 'Settings published successfully',
      data: published
    });
  });

  /**
   * Save draft customizer settings
   */
  static saveDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.body;
    const settings = req.body;

    // Save draft (mock for now)
    const draft: CustomizerSettings = {
      id: `draft_${Date.now()}`,
      userId: userId!,
      themeId,
      settings: settings,
      isDraft: true,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Cache draft for 1 hour
    const cacheKey = `customizer:draft:${userId}:${themeId}`;
    await cacheService.set(cacheKey, draft, { ttl: 3600 });

    logger.info('Customizer draft saved', { userId, themeId, draftId: draft.id });
    
    res.json({
      success: true,
      message: 'Draft saved successfully',
      data: draft
    });
  });

  /**
   * Get draft customizer settings
   */
  static getDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.query;

    // Get draft from cache
    const cacheKey = `customizer:draft:${userId}:${themeId}`;
    const draft = await cacheService.get(cacheKey);

    if (!draft) {
      throw createNotFoundError('No draft found');
    }

    logger.info('Customizer draft retrieved', { userId, themeId });
    res.json(draft);
  });

  /**
   * Reset customizer settings to defaults
   */
  static resetSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.body;

    // Default settings
    const defaultSettings: CustomizerSettings = {
      userId: userId!,
      themeId: themeId as string,
      settings: {
        siteIdentity: {
          siteTitle: 'My Website',
          tagline: 'Just another website',
          logo: undefined,
          favicon: undefined
        },
        colors: {
          backgroundColor: '#ffffff',
          textColor: '#333333',
          linkColor: '#0073aa',
          accentColor: '#0073aa',
          headerBackgroundColor: '#23282d',
          headerTextColor: '#ffffff',
          darkMode: false
        },
        menus: {
          primaryMenu: undefined,
          footerMenu: undefined,
          socialMenu: undefined
        },
        backgroundImage: {
          url: undefined,
          preset: 'default',
          position: 'center center',
          size: 'auto',
          repeat: 'repeat',
          attachment: 'scroll'
        },
        additionalCss: '',
        homepage: {
          showOnFront: 'posts',
          pageOnFront: undefined,
          pageForPosts: undefined
        }
      },
      isDraft: false,
      isPublished: true,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clear all caches
    const cacheKeys = [
      `customizer:${userId}:${themeId}`,
      `customizer:draft:${userId}:${themeId}`
    ];
    await Promise.all(cacheKeys.map(key => cacheService.delete(key)));

    logger.info('Customizer settings reset to defaults', { userId, themeId });
    
    res.json({
      success: true,
      message: 'Settings reset to defaults',
      data: defaultSettings
    });
  });

  /**
   * Export customizer settings
   */
  static exportSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default' } = req.query;

    // Get current settings
    const cacheKey = `customizer:${userId}:${themeId}`;
    const settings = await cacheService.get(cacheKey);

    if (!settings) {
      throw createNotFoundError('No settings found to export');
    }

    // Prepare export data
    const exportData = {
      version: '1.0.0',
      exportedAt: dayjs().toISOString(),
      themeId,
      settings: (settings as any).settings,
      metadata: {
        exportedBy: userId,
        platform: 'O4O Platform',
        themeVersion: '1.0.0'
      }
    };

    logger.info('Customizer settings exported', { userId, themeId });

    // Send as JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="customizer-settings-${themeId}-${dayjs().format('YYYY-MM-DD')}.json"`);
    res.json(exportData);
  });

  /**
   * Import customizer settings
   */
  static importSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { themeId = 'default', settings, overwrite = false } = req.body;

    // Validate import data
    if (!settings || !settings.siteIdentity) {
      throw createValidationError('Invalid import data');
    }

    // Check version compatibility
    if (settings.version && settings.version !== '1.0.0') {
      logger.warn('Importing settings from different version', { 
        userId, 
        importVersion: settings.version 
      });
    }

    // Import settings
    const imported: CustomizerSettings = {
      id: `cs_${Date.now()}`,
      userId: userId!,
      themeId,
      settings: settings.settings || settings,
      isDraft: !overwrite,
      isPublished: overwrite,
      publishedAt: overwrite ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clear cache if overwriting
    if (overwrite) {
      const cacheKey = `customizer:${userId}:${themeId}`;
      await cacheService.delete(cacheKey);
    }

    logger.info('Customizer settings imported', { 
      userId, 
      themeId, 
      settingsId: imported.id,
      overwrite 
    });
    
    res.json({
      success: true,
      message: `Settings ${overwrite ? 'imported and published' : 'imported as draft'}`,
      data: imported
    });
  });
}

// Helper function to validate CSS
function validateCSS(css: string): string[] {
  const errors: string[] = [];
  
  // Check for balanced braces
  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }

  // Check for unclosed strings
  const quotes = css.match(/["']/g) || [];
  if (quotes.length % 2 !== 0) {
    errors.push('Unclosed string found');
  }

  // Check for common CSS errors
  if (css.includes(';;')) {
    errors.push('Double semicolon found');
  }

  if (css.includes('{{') || css.includes('}}')) {
    errors.push('Double braces found');
  }

  return errors;
}

export default CustomizerController;