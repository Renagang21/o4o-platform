/**
 * Customizer API Routes
 * Endpoints for managing scroll-to-top, button settings, and breadcrumbs
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import { SettingsService } from '../../services/settingsService';
import {
  ScrollToTopSchema,
  ButtonSettingsSchema,
  BreadcrumbsSchema,
  ScrollToTopInput,
  ButtonSettingsInput,
  BreadcrumbsInput,
} from '../../validators/customizer.validators';
import { deepMerge } from '../../utils/deep-merge';
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
    const customizerSettings = await settingsService.getSettings('customizer');
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
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = ScrollToTopSchema.parse(req.body);

      // Get existing customizer settings
      const customizerSettings = (await settingsService.getSettings('customizer')) || {};
      const existingScrollToTop = (customizerSettings as any)?.scrollToTop || defaultScrollToTop;

      // Deep merge existing + new data
      const mergedScrollToTop = deepMerge(existingScrollToTop, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        scrollToTop: mergedScrollToTop,
      };

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
    const customizerSettings = await settingsService.getSettings('customizer');
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
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = ButtonSettingsSchema.parse(req.body);

      // Get existing customizer settings
      const customizerSettings = (await settingsService.getSettings('customizer')) || {};
      const existingButtons = (customizerSettings as any)?.buttons || defaultButtonSettings;

      // Deep merge existing + new data
      const mergedButtons = deepMerge(existingButtons, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        buttons: mergedButtons,
      };

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
    const customizerSettings = await settingsService.getSettings('customizer');
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
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const validatedData = BreadcrumbsSchema.parse(req.body);

      // Get existing customizer settings
      const customizerSettings = (await settingsService.getSettings('customizer')) || {};
      const existingBreadcrumbs = (customizerSettings as any)?.breadcrumbs || defaultBreadcrumbs;

      // Deep merge existing + new data
      const mergedBreadcrumbs = deepMerge(existingBreadcrumbs, validatedData);

      // Update customizer settings
      const updatedSettings = {
        ...customizerSettings,
        breadcrumbs: mergedBreadcrumbs,
      };

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

export default router;
