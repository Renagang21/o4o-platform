/**
 * Service Admin Routes
 * Phase 8 — Service Admin Dashboard
 *
 * API endpoints for service administration and monitoring.
 */

import { Router, Request, Response } from 'express';
import logger from '../utils/logger.js';
import { templateRegistry } from '../service-templates/template-registry.js';
import { initPackRegistry } from '../service-templates/init-pack-registry.js';
import { serviceInitializer } from '../service-templates/service-initializer.js';
import { themePresetService } from '../services/theme-preset.service.js';
import { moduleLoader } from '../modules/module-loader.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

/**
 * Helper to get installed apps info from moduleLoader
 */
function getInstalledAppsInfo() {
  const allModuleIds = moduleLoader.getAllModules();
  const activeModuleIds = moduleLoader.getActiveModules();

  return allModuleIds.map(id => {
    const entry = moduleLoader.getModule(id);
    if (!entry) return null;

    const { module, status, loadedAt, activatedAt } = entry;
    return {
      appId: module.id,
      name: module.name,
      version: module.version,
      type: module.type,
      status: status,
      installedAt: loadedAt,
      hasUpdate: false, // placeholder - would need update checking system
    };
  }).filter(Boolean) as Array<{
    appId: string;
    name: string;
    version: string;
    type: string;
    status: string;
    installedAt: Date;
    hasUpdate: boolean;
  }>;
}

const router = Router();

/**
 * GET /api/v1/service-admin/summary
 * Get service summary for a tenant
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.query.tenantId as string;
    const serviceGroup = (req.serviceGroup || req.query.serviceGroup) as ServiceGroup;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
    }

    // Get installed apps
    const installedApps = getInstalledAppsInfo();
    const activeApps = installedApps.filter(app => app.status === 'active');

    // Get effective theme
    const theme = await themePresetService.getEffectiveTheme(tenantId, serviceGroup || 'global');

    // Get init pack info
    const initPacks = initPackRegistry.getAllInitPacks();
    const matchingInitPack = initPacks.find(p => p.serviceGroup === serviceGroup);

    res.json({
      success: true,
      data: {
        tenantId,
        serviceGroup: serviceGroup || 'global',
        apps: {
          total: installedApps.length,
          active: activeApps.length,
          installed: installedApps.map(app => ({
            appId: app.appId,
            name: app.name,
            version: app.version,
            status: app.status,
          })),
        },
        theme: {
          id: theme.id,
          name: theme.name,
        },
        initPack: matchingInitPack ? {
          id: matchingInitPack.id,
          name: matchingInitPack.name,
          menusCount: matchingInitPack.defaultMenus?.length || 0,
          categoriesCount: matchingInitPack.defaultCategories?.length || 0,
        } : null,
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service summary',
    });
  }
});

/**
 * GET /api/v1/service-admin/apps
 * Get installed apps for service
 */
router.get('/apps', async (req: Request, res: Response) => {
  try {
    const installedApps = getInstalledAppsInfo();

    // Group apps by type
    const coreApps = installedApps.filter(app => app.type === 'core');
    const extensionApps = installedApps.filter(app => app.type === 'extension');
    const standaloneApps = installedApps.filter(app => !app.type || app.type === 'standalone');

    res.json({
      success: true,
      data: {
        total: installedApps.length,
        byType: {
          core: coreApps.length,
          extension: extensionApps.length,
          standalone: standaloneApps.length,
        },
        apps: installedApps.map(app => ({
          appId: app.appId,
          name: app.name,
          version: app.version,
          type: app.type || 'standalone',
          status: app.status,
          installedAt: app.installedAt,
          hasUpdate: app.hasUpdate,
        })),
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get apps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installed apps',
    });
  }
});

/**
 * GET /api/v1/service-admin/theme
 * Get current theme for tenant
 */
router.get('/theme', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.query.tenantId as string;
    const serviceGroup = (req.serviceGroup || req.query.serviceGroup) as ServiceGroup;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
    }

    const theme = await themePresetService.getEffectiveTheme(tenantId, serviceGroup || 'global');
    const cssVariables = themePresetService.generateCSSVariables(theme);
    const css = themePresetService.generateCSS(theme);

    res.json({
      success: true,
      data: {
        theme,
        cssVariables,
        css,
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get theme',
    });
  }
});

/**
 * PUT /api/v1/service-admin/theme
 * Update theme for tenant
 */
router.put('/theme', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.body.tenantId;
    const serviceGroup = req.serviceGroup || req.body.serviceGroup;
    const { colors, typography, borderRadius } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
    }

    // Get existing or default theme
    let theme = await themePresetService.getTenantTheme(tenantId);

    if (!theme) {
      // Create new theme based on default
      const defaultTheme = themePresetService.getDefaultPreset(serviceGroup || 'global');
      theme = await themePresetService.setTenantTheme(tenantId, {
        ...defaultTheme,
        id: `${tenantId}-custom`,
        name: `${tenantId} Custom Theme`,
      }, serviceGroup);
    }

    // Update colors if provided
    if (colors) {
      theme = await themePresetService.updateTenantThemeColors(tenantId, colors);
    }

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found',
      });
    }

    res.json({
      success: true,
      data: {
        theme,
        cssVariables: themePresetService.generateCSSVariables(theme),
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to update theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update theme',
    });
  }
});

/**
 * POST /api/v1/service-admin/theme/reset
 * Reset theme to default
 */
router.post('/theme/reset', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.body.tenantId;
    const serviceGroup = (req.serviceGroup || req.body.serviceGroup || 'global') as ServiceGroup;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
    }

    const theme = await themePresetService.resetTenantTheme(tenantId, serviceGroup);

    res.json({
      success: true,
      data: {
        theme,
        message: `Theme reset to ${serviceGroup} default`,
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to reset theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset theme',
    });
  }
});

/**
 * GET /api/v1/service-admin/init-preview
 * Get initialization preview for a template
 */
router.get('/init-preview/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const preview = serviceInitializer.getInitializationPreview(templateId);

    if (!preview.initPack) {
      return res.status(404).json({
        success: false,
        error: `No init pack found for template: ${templateId}`,
      });
    }

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get init preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get initialization preview',
    });
  }
});

/**
 * GET /api/v1/service-admin/templates
 * Get available templates with init pack info
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const serviceGroup = req.query.serviceGroup as ServiceGroup | undefined;

    let templates = templateRegistry.getAllTemplates();

    if (serviceGroup) {
      templates = templates.filter(t => t.serviceGroup === serviceGroup);
    }

    // Enrich with init pack info
    const enrichedTemplates = templates.map(template => {
      const initPack = initPackRegistry.getInitPackForTemplate(template.id);
      const preview = serviceInitializer.getInitializationPreview(template.id);

      return {
        ...template,
        hasInitPack: !!initPack,
        initPreview: {
          menusCount: preview.menusCount,
          categoriesCount: preview.categoriesCount,
          pagesCount: preview.pagesCount,
          hasTheme: preview.hasTheme,
          hasSettings: preview.hasSettings,
          rolesCount: preview.rolesCount,
        },
      };
    });

    res.json({
      success: true,
      data: enrichedTemplates,
      count: enrichedTemplates.length,
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
    });
  }
});

/**
 * GET /api/v1/service-admin/stats
 * Get overall service statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const templateStats = templateRegistry.getStats();
    const initPackStats = initPackRegistry.getStats();
    const installedApps = getInstalledAppsInfo();
    const defaultThemes = themePresetService.getAllDefaultPresets();

    res.json({
      success: true,
      data: {
        templates: templateStats,
        initPacks: initPackStats,
        apps: {
          installed: installedApps.length,
          active: installedApps.filter(a => a.status === 'active').length,
          withUpdates: installedApps.filter(a => a.hasUpdate).length,
        },
        themes: {
          defaultPresets: Object.keys(defaultThemes).length,
        },
      },
    });
  } catch (error) {
    logger.error('[ServiceAdmin] Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

export default router;
