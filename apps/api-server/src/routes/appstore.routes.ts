/**
 * AppStore API Routes
 * Phase 5 — AppStore + Module Loader
 *
 * Provides REST endpoints for app lifecycle management:
 * - GET    /api/v1/appstore          - List all apps (catalog + status)
 * - GET    /api/v1/appstore/:appId   - Get app details
 * - POST   /api/v1/appstore/install  - Install an app
 * - POST   /api/v1/appstore/activate - Activate an installed app
 * - POST   /api/v1/appstore/deactivate - Deactivate an active app
 * - DELETE /api/v1/appstore/uninstall  - Uninstall an app
 */

import { Router, Request, Response } from 'express';
import { appStoreService } from '../services/AppStoreService.js';
import { APPS_CATALOG, getCatalogItem, searchCatalog, filterByCategory, getCategories } from '../app-manifests/appsCatalog.js';
import { moduleLoader } from '../modules/module-loader.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/appstore
 * List all apps with their status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    // Get catalog items (optionally filtered)
    let catalogItems = APPS_CATALOG;

    if (search && typeof search === 'string') {
      catalogItems = searchCatalog(search);
    } else if (category && typeof category === 'string') {
      catalogItems = filterByCategory(category);
    }

    // Enrich with module status
    const enrichedApps = catalogItems.map((catalogItem) => {
      const moduleEntry = moduleLoader.getModule(catalogItem.appId);
      return {
        ...catalogItem,
        installed: !!moduleEntry,
        status: moduleEntry?.status || 'not_installed',
        loadedAt: moduleEntry?.loadedAt,
        activatedAt: moduleEntry?.activatedAt,
      };
    });

    res.json({
      success: true,
      data: enrichedApps,
      total: enrichedApps.length,
      categories: getCategories(),
    });
  } catch (error) {
    logger.error('[AppStore Routes] List apps error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list apps',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/appstore/modules
 * List all loaded modules (for debugging)
 */
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const registry = moduleLoader.getRegistry();
    const modules: any[] = [];

    for (const [moduleId, entry] of registry) {
      modules.push({
        id: moduleId,
        status: entry.status,
        version: entry.module.version,
        dependsOn: entry.module.dependsOn,
        loadedAt: entry.loadedAt,
        activatedAt: entry.activatedAt,
        error: entry.error,
        hasLifecycle: !!entry.module.lifecycle,
        hasRoutes: !!entry.module.backend?.routes,
      });
    }

    res.json({
      success: true,
      data: modules,
      total: modules.length,
      activeCount: moduleLoader.getActiveModules().length,
    });
  } catch (error) {
    logger.error('[AppStore Routes] List modules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list modules',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/appstore/:appId
 * Get app details
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const details = appStoreService.getAppDetails(appId);

    if (!details.catalog && !details.module) {
      return res.status(404).json({
        success: false,
        error: 'App not found',
        appId,
      });
    }

    res.json({
      success: true,
      data: {
        ...details.catalog,
        installed: !!details.module,
        status: details.module?.status || 'not_installed',
        loadedAt: details.module?.loadedAt,
        activatedAt: details.module?.activatedAt,
        moduleDetails: details.module
          ? {
              version: details.module.module.version,
              dependsOn: details.module.module.dependsOn,
              hasLifecycle: !!details.module.module.lifecycle,
              hasRoutes: !!details.module.module.backend?.routes,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('[AppStore Routes] Get app details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get app details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/appstore/install
 * Install an app
 */
router.post('/install', async (req: Request, res: Response) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({
        success: false,
        error: 'appId is required',
      });
    }

    logger.info(`[AppStore Routes] Installing app: ${appId}`);

    await appStoreService.installApp(appId);

    const moduleEntry = moduleLoader.getModule(appId);

    res.json({
      success: true,
      message: `App ${appId} installed successfully`,
      status: moduleEntry?.status || 'installed',
      appId,
    });
  } catch (error) {
    logger.error('[AppStore Routes] Install app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install app',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/appstore/activate
 * Activate an installed app
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({
        success: false,
        error: 'appId is required',
      });
    }

    logger.info(`[AppStore Routes] Activating app: ${appId}`);

    await appStoreService.activateApp(appId);

    res.json({
      success: true,
      message: `App ${appId} activated successfully`,
      status: 'activated',
      appId,
    });
  } catch (error) {
    logger.error('[AppStore Routes] Activate app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate app',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/appstore/deactivate
 * Deactivate an active app
 */
router.post('/deactivate', async (req: Request, res: Response) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({
        success: false,
        error: 'appId is required',
      });
    }

    logger.info(`[AppStore Routes] Deactivating app: ${appId}`);

    await appStoreService.deactivateApp(appId);

    res.json({
      success: true,
      message: `App ${appId} deactivated successfully`,
      status: 'deactivated',
      appId,
    });
  } catch (error) {
    logger.error('[AppStore Routes] Deactivate app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate app',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v1/appstore/uninstall
 * Uninstall an app
 */
router.delete('/uninstall', async (req: Request, res: Response) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({
        success: false,
        error: 'appId is required',
      });
    }

    logger.info(`[AppStore Routes] Uninstalling app: ${appId}`);

    await appStoreService.uninstallApp(appId);

    res.json({
      success: true,
      message: `App ${appId} uninstalled successfully`,
      status: 'uninstalled',
      appId,
    });
  } catch (error) {
    logger.error('[AppStore Routes] Uninstall app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to uninstall app',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
