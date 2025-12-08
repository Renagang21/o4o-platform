import { Router, Request, Response, NextFunction } from 'express';
import { AppManager } from '../../services/AppManager.js';
import { DependencyError } from '../../services/AppDependencyResolver.js';
import { OwnershipValidationError } from '../../services/AppTableOwnershipResolver.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { APPS_CATALOG, getCatalogItem } from '../../app-manifests/appsCatalog.js';
import { loadLocalManifest, hasManifest } from '../../app-manifests/index.js';
import { isNewerVersion } from '../../utils/semver.js';

const router: Router = Router();

// All admin app routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Create singleton instance
const appManager = new AppManager();

/**
 * GET /api/admin/apps/market
 * Get app catalog (available apps that can be installed)
 */
router.get('/market', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ apps: APPS_CATALOG });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/apps
 * List all installed apps with update detection
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apps = await appManager.listInstalled();

    // Enrich each app with update information and ownership data
    const enrichedApps = apps.map(app => {
      const catalogItem = getCatalogItem(app.appId);
      const availableVersion = catalogItem?.version || app.version;
      const hasUpdate = catalogItem ? isNewerVersion(app.version, catalogItem.version) : false;

      // Load manifest to get ownership information
      const manifest = hasManifest(app.appId) ? loadLocalManifest(app.appId) : null;
      const ownsTables = manifest?.ownsTables || [];
      const ownsCPT = manifest?.ownsCPT || [];
      const ownsACF = manifest?.ownsACF || [];

      return {
        ...app,
        availableVersion,
        hasUpdate,
        ownsTables,
        ownsCPT,
        ownsACF,
      };
    });

    res.json({ apps: enrichedApps });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/apps/:appId
 * Get specific app status
 */
router.get('/:appId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.params;
    const app = await appManager.getAppStatus(appId);

    if (!app) {
      return res.status(404).json({ error: `App ${appId} not found` });
    }

    res.json({ app });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/install
 * Install an app
 *
 * Body: { appId: string }
 */
router.post('/install', async (req: Request, res: Response) => {
  const { appId } = req.body;

  if (!appId) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_APP_ID',
      message: 'appId is required',
    });
  }

  try {
    console.log(`[Install] Starting install for app: ${appId}`);

    await appManager.install(appId);

    console.log(`[Install] Completed successfully for app: ${appId}`);
    return res.json({
      ok: true,
      message: `App ${appId} installed successfully`,
    });
  } catch (error: any) {
    console.error(`[Install] Failed for app ${appId}:`, error);

    // Handle ownership validation errors
    if (error instanceof OwnershipValidationError) {
      return res.status(400).json({
        ok: false,
        error: 'OWNERSHIP_VIOLATION',
        message: error.message,
        violations: error.violations,
      });
    }

    // Handle dependency errors
    if (error instanceof DependencyError) {
      return res.status(400).json({
        ok: false,
        error: 'DEPENDENCY_ERROR',
        message: error.message,
        dependents: error.dependents,
      });
    }

    // Handle all other errors - always return JSON, never pass to next()
    return res.status(500).json({
      ok: false,
      error: 'INSTALL_FAILED',
      message: error.message || 'Unknown error occurred during installation',
    });
  }
});

/**
 * POST /api/admin/apps/activate
 * Activate an app
 *
 * Body: { appId: string }
 */
router.post('/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.activate(appId);

    res.json({
      ok: true,
      message: `App ${appId} activated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/deactivate
 * Deactivate an app
 *
 * Body: { appId: string }
 */
router.post('/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.deactivate(appId);

    res.json({
      ok: true,
      message: `App ${appId} deactivated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/uninstall
 * Uninstall an app
 *
 * Body: { appId: string, force?: boolean, purge?: boolean }
 */
router.post('/uninstall', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId, force = false, purge = false } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.uninstall(appId, { force, purgeData: purge });

    res.json({
      ok: true,
      message: purge
        ? `App ${appId} and its data uninstalled successfully`
        : `App ${appId} uninstalled successfully (data kept)`,
      purged: purge,
    });
  } catch (error) {
    // Handle dependency errors
    if (error instanceof DependencyError) {
      return res.status(400).json({
        ok: false,
        error: 'DEPENDENTS_EXIST',
        message: error.message,
        dependents: error.dependents,
      });
    }

    next(error);
  }
});

/**
 * POST /api/admin/apps/update
 * Update an app to the latest version from catalog
 *
 * Body: { appId: string }
 */
router.post('/update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.update(appId);

    res.json({
      ok: true,
      message: `App ${appId} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
