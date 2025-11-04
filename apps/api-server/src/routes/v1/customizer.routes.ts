/**
 * Customizer API Routes
 * Endpoints for managing scroll-to-top, button settings, and breadcrumbs
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { SettingsService } from '../../services/settingsService.js';
import {
  ScrollToTopSchema,
  ButtonSettingsSchema,
  BreadcrumbsSchema,
  ScrollToTopInput,
  ButtonSettingsInput,
  BreadcrumbsInput,
} from '../../validators/customizer.validators.js';
import { deepMerge } from '../../utils/deep-merge.js';
import { migrateCustomizerSettings, validateMigration } from '../../utils/schema-migration.js';
import { ZodError } from 'zod';

const router: Router = Router();
const settingsService = new SettingsService();

// ============================================
// Default Settings
// ============================================

const defaultScrollToTop: ScrollToTopInput = {
  enabled: true,
  displayType: 'both',
  threshold: 300,
  backgroundColor: '#3b82f6',
  iconColor: '#ffffff',
  position: 'right',
};

const defaultButtonSettings: ButtonSettingsInput = {
  primary: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    borderWidth: 0,
    borderColor: '#3b82f6',
    borderStyle: 'solid',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    hoverBackgroundColor: '#2563eb',
    hoverTextColor: '#ffffff',
    hoverBorderColor: '#2563eb',
    transitionDuration: 200,
    fontSize: { desktop: 16, tablet: 15, mobile: 14 },
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: 0,
  },
};

const defaultBreadcrumbs: BreadcrumbsInput = {
  enabled: true,
  position: 'below-header',
  homeText: 'Home',
  separator: '>',
  showCurrentPage: true,
  showOnHomepage: false,
  linkColor: '#3b82f6',
  currentPageColor: '#6b7280',
  separatorColor: '#9ca3af',
  hoverColor: '#2563eb',
  fontSize: { desktop: 14, tablet: 13, mobile: 12 },
  fontWeight: 400,
  textTransform: 'none',
  itemSpacing: 8,
  marginTop: 16,
  marginBottom: 16,
  showIcons: false,
  mobileHidden: false,
};

// ============================================
// Scroll-to-Top Endpoints
// ============================================

/**
 * GET /api/v1/customizer/scroll-to-top
 * Get scroll-to-top settings (public)
 */
router.get('/scroll-to-top', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');

    // Apply migration if needed
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    const scrollToTop = (customizerSettings as any)?.scrollToTop || defaultScrollToTop;

    res.json({
      success: true,
      data: scrollToTop,
    });
  } catch (error: any) {
    console.error('Error fetching scroll-to-top settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scroll-to-top settings',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/customizer/scroll-to-top
 * Update scroll-to-top settings (authenticated)
 */
router.put(
  '/scroll-to-top',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = ScrollToTopSchema.parse(req.body);

      // Get existing customizer settings and migrate
      let customizerSettings = (await settingsService.getSettings('customizer')) || {};
      customizerSettings = migrateCustomizerSettings(customizerSettings);

      const existingScrollToTop = (customizerSettings as any)?.scrollToTop || defaultScrollToTop;

      // Deep merge existing + new data
      const mergedScrollToTop = deepMerge(existingScrollToTop, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        scrollToTop: mergedScrollToTop,
        _meta: {
          ...(customizerSettings as any)?._meta,
          lastModified: new Date().toISOString(),
          isDirty: false,
        },
      };

      // Validate migration
      const validation = validateMigration(updatedSettings);
      if (!validation.valid) {
        console.warn('[Customizer] Migration validation warnings:', validation.errors);
      }

      await settingsService.updateSettings('customizer', updatedSettings);

      res.json({
        success: true,
        data: mergedScrollToTop,
        message: 'Scroll-to-top settings updated successfully',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      console.error('Error updating scroll-to-top settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update scroll-to-top settings',
        message: error.message,
      });
    }
  }
);

// ============================================
// Button Settings Endpoints
// ============================================

/**
 * GET /api/v1/customizer/button-settings
 * Get button settings (public)
 */
router.get('/button-settings', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');

    // Apply migration if needed
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    const buttons = (customizerSettings as any)?.buttons || defaultButtonSettings;

    res.json({
      success: true,
      data: buttons,
    });
  } catch (error: any) {
    console.error('Error fetching button settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch button settings',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/customizer/button-settings
 * Update button settings (authenticated)
 */
router.put(
  '/button-settings',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = ButtonSettingsSchema.parse(req.body);

      // Get existing customizer settings and migrate
      let customizerSettings = (await settingsService.getSettings('customizer')) || {};
      customizerSettings = migrateCustomizerSettings(customizerSettings);

      const existingButtons = (customizerSettings as any)?.buttons || defaultButtonSettings;

      // Deep merge existing + new data
      const mergedButtons = deepMerge(existingButtons, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        buttons: mergedButtons,
        _meta: {
          ...(customizerSettings as any)?._meta,
          lastModified: new Date().toISOString(),
          isDirty: false,
        },
      };

      // Validate migration
      const validation = validateMigration(updatedSettings);
      if (!validation.valid) {
        console.warn('[Customizer] Migration validation warnings:', validation.errors);
      }

      await settingsService.updateSettings('customizer', updatedSettings);

      res.json({
        success: true,
        data: mergedButtons,
        message: 'Button settings updated successfully',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      console.error('Error updating button settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update button settings',
        message: error.message,
      });
    }
  }
);

// ============================================
// Breadcrumbs Settings Endpoints
// ============================================

/**
 * GET /api/v1/customizer/breadcrumbs-settings
 * Get breadcrumbs settings (public)
 */
router.get('/breadcrumbs-settings', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');

    // Apply migration if needed
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    const breadcrumbs = (customizerSettings as any)?.breadcrumbs || defaultBreadcrumbs;

    res.json({
      success: true,
      data: breadcrumbs,
    });
  } catch (error: any) {
    console.error('Error fetching breadcrumbs settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch breadcrumbs settings',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/customizer/breadcrumbs-settings
 * Update breadcrumbs settings (authenticated)
 */
router.put(
  '/breadcrumbs-settings',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = BreadcrumbsSchema.parse(req.body);

      // Get existing customizer settings and migrate
      let customizerSettings = (await settingsService.getSettings('customizer')) || {};
      customizerSettings = migrateCustomizerSettings(customizerSettings);

      const existingBreadcrumbs = (customizerSettings as any)?.breadcrumbs || defaultBreadcrumbs;

      // Deep merge existing + new data
      const mergedBreadcrumbs = deepMerge(existingBreadcrumbs, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        breadcrumbs: mergedBreadcrumbs,
        _meta: {
          ...(customizerSettings as any)?._meta,
          lastModified: new Date().toISOString(),
          isDirty: false,
        },
      };

      // Validate migration
      const validation = validateMigration(updatedSettings);
      if (!validation.valid) {
        console.warn('[Customizer] Migration validation warnings:', validation.errors);
      }

      await settingsService.updateSettings('customizer', updatedSettings);

      res.json({
        success: true,
        data: mergedBreadcrumbs,
        message: 'Breadcrumbs settings updated successfully',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      console.error('Error updating breadcrumbs settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update breadcrumbs settings',
        message: error.message,
      });
    }
  }
);

// ============================================
// Mobile Header Settings Endpoints
// ============================================

const defaultMobileHeaderSettings = {
  enabled: true,
  breakpoint: 768,
  mobileLogoUrl: '',
  mobileLogoWidth: 120,
  hamburgerStyle: 'default',
  menuPosition: 'left',
  menuAnimation: 'slide',
  overlayEnabled: true,
  overlayColor: '#000000',
  overlayOpacity: 0.5,
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showAccountIcon: true,
  showCartIcon: true,
  showSearchIcon: false,
  submenuStyle: 'accordion',
  closeOnItemClick: false,
  swipeToClose: true
};

/**
 * GET /api/customizer/mobile-header-settings
 * Get mobile header settings (public)
 */
router.get('/mobile-header-settings', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    const mobileHeader = (customizerSettings as any)?.mobileHeader || defaultMobileHeaderSettings;

    res.json({
      success: true,
      data: mobileHeader,
    });
  } catch (error: any) {
    console.error('Error fetching mobile header settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mobile header settings',
      message: error.message,
    });
  }
});

// ============================================
// Header Sticky Settings Endpoints
// ============================================

const defaultStickyHeaderSettings = {
  enabled: false,
  triggerHeight: 100,
  stickyOn: ['primary'],
  shrinkEffect: false,
  shrinkHeight: {
    desktop: 60,
    tablet: 55,
    mobile: 50
  },
  backgroundColor: '#ffffff',
  backgroundOpacity: 1,
  boxShadow: true,
  shadowIntensity: 'medium',
  animationDuration: 300,
  hideOnScrollDown: false,
  zIndex: 999
};

/**
 * GET /api/customizer/settings/header/sticky
 * Get sticky header settings (public)
 */
router.get('/settings/header/sticky', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    const sticky = (customizerSettings as any)?.header?.sticky || defaultStickyHeaderSettings;

    res.json({
      success: true,
      data: sticky,
    });
  } catch (error: any) {
    console.error('Error fetching sticky header settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sticky header settings',
      message: error.message,
    });
  }
});

// ============================================
// Unified Customizer Endpoint
// ============================================

/**
 * GET /api/v1/customizer
 * Get all customizer settings including buttons, breadcrumbs, scroll-to-top (public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let customizerSettings = await settingsService.getSettings('customizer');

    // Apply migration if needed
    customizerSettings = migrateCustomizerSettings(customizerSettings);

    // Ensure all settings are included
    const completeSettings = {
      ...customizerSettings,
      buttons: (customizerSettings as any)?.buttons || defaultButtonSettings,
      breadcrumbs: (customizerSettings as any)?.breadcrumbs || defaultBreadcrumbs,
      scrollToTop: (customizerSettings as any)?.scrollToTop || defaultScrollToTop,
      _version: (customizerSettings as any)?._version || 1,
      _meta: (customizerSettings as any)?._meta || {
        lastModified: new Date().toISOString(),
        isDirty: false,
      },
    };

    res.json({
      success: true,
      data: completeSettings,
    });
  } catch (error: any) {
    console.error('Error fetching customizer settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customizer settings',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/customizer
 * Update all customizer settings (authenticated)
 */
router.put(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get existing settings
      let customizerSettings = (await settingsService.getSettings('customizer')) || {};
      customizerSettings = migrateCustomizerSettings(customizerSettings);

      // Merge with new data
      const updatedSettings = {
        ...customizerSettings,
        ...req.body,
        _version: ((customizerSettings as any)?._version || 0) + 1,
        _meta: {
          ...(customizerSettings as any)?._meta,
          lastModified: new Date().toISOString(),
          isDirty: false,
        },
      };

      // Save settings
      await settingsService.updateSettings('customizer', updatedSettings);

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Customizer settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating customizer settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update customizer settings',
        message: error.message,
      });
    }
  }
);

export default router;
