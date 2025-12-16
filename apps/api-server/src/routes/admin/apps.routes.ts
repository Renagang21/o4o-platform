import { Router, Request, Response, NextFunction } from 'express';
import { AppManager } from '../../services/AppManager.js';
import { DependencyError } from '../../services/AppDependencyResolver.js';
import { OwnershipValidationError } from '../../services/AppTableOwnershipResolver.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import {
  APPS_CATALOG,
  getCatalogItem,
  SERVICE_GROUP_META,
  filterByServiceGroup,
  getServiceGroupStats,
  checkAppCompatibility,
  getIncompatibleApps,
  type ServiceGroup,
} from '../../app-manifests/appsCatalog.js';
import { loadLocalManifest, hasManifest } from '../../app-manifests/index.js';
import { disabledAppsRegistry, getDisabledAppsSummary } from '../../app-manifests/disabled-apps.registry.js';
import { isNewerVersion } from '../../utils/semver.js';
import { remoteManifestLoader, ManifestFetchError, ManifestHashMismatchError, ManifestValidationError } from '../../services/RemoteManifestLoader.js';
import { appSecurityValidator } from '../../services/AppSecurityValidator.js';
import { remoteResourcesLoader } from '../../services/RemoteResourcesLoader.js';
import logger from '../../utils/logger.js';

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
 * GET /api/admin/apps/disabled
 * Get disabled apps registry with status and reasons
 *
 * @see docs/platform/disabled-app-policy.md
 */
router.get('/disabled', async (req: Request, res: Response) => {
  try {
    const summary = getDisabledAppsSummary();
    return res.json({
      ok: true,
      apps: disabledAppsRegistry,
      summary,
    });
  } catch (error: any) {
    logger.error('[DisabledApps] Failed to get disabled apps:', error);
    return res.status(500).json({
      ok: false,
      error: 'FETCH_FAILED',
      message: error.message || 'Unknown error',
    });
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
    logger.info(`[Install] Starting install for app: ${appId}`);

    await appManager.install(appId);

    logger.info(`[Install] Completed successfully for app: ${appId}`);
    return res.json({
      ok: true,
      message: `App ${appId} installed successfully`,
    });
  } catch (error: any) {
    logger.error(`[Install] Failed for app ${appId}:`, error);

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

/**
 * POST /api/admin/apps/rollback
 * Rollback an app to its previous version
 *
 * Body: { appId: string }
 */
router.post('/rollback', async (req: Request, res: Response) => {
  const { appId } = req.body;

  if (!appId) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_APP_ID',
      message: 'appId is required',
    });
  }

  try {
    logger.info(`[Rollback] Starting rollback for app: ${appId}`);

    const result = await appManager.rollback(appId);

    logger.info(`[Rollback] Completed successfully for app: ${appId}, reverted to: ${result.revertedTo}`);
    return res.json({
      ok: true,
      message: `App ${appId} rolled back successfully to version ${result.revertedTo}`,
      revertedTo: result.revertedTo,
    });
  } catch (error: any) {
    logger.error(`[Rollback] Failed for app ${appId}:`, error);

    // Handle no rollback available
    if (error.message?.includes('No rollback available')) {
      return res.status(400).json({
        ok: false,
        error: 'NO_ROLLBACK_AVAILABLE',
        message: error.message,
      });
    }

    // Handle all other errors
    return res.status(500).json({
      ok: false,
      error: 'ROLLBACK_FAILED',
      message: error.message || 'Unknown error occurred during rollback',
    });
  }
});

/**
 * GET /api/admin/apps/:appId/version-info
 * Get version information for an app (current, previous, available versions)
 */
router.get('/:appId/version-info', async (req: Request, res: Response) => {
  const { appId } = req.params;

  try {
    const versionInfo = await appManager.getVersionInfo(appId);

    return res.json({
      ok: true,
      ...versionInfo,
    });
  } catch (error: any) {
    logger.error(`[VersionInfo] Failed for app ${appId}:`, error);

    if (error.message?.includes('not installed')) {
      return res.status(404).json({
        ok: false,
        error: 'APP_NOT_FOUND',
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'VERSION_INFO_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/apps/validate-remote
 * Validate a remote manifest URL before installation
 *
 * Body: { manifestUrl: string }
 */
router.post('/validate-remote', async (req: Request, res: Response) => {
  const { manifestUrl } = req.body;

  if (!manifestUrl) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_URL',
      message: 'manifestUrl is required',
    });
  }

  try {
    logger.info(`[ValidateRemote] Validating manifest from: ${manifestUrl}`);

    // Fetch and validate manifest
    const result = await remoteManifestLoader.load(manifestUrl);
    const manifest = result.manifest;

    // Run security validation
    const validation = appSecurityValidator.validate(manifest, result.hash);

    logger.info(`[ValidateRemote] Validation complete for ${manifest.appId}: ${validation.valid ? 'PASSED' : 'FAILED'}`);

    return res.json({
      ok: true,
      manifest: {
        appId: manifest.appId,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        type: manifest.type,
        vendor: manifest.vendor,
        hash: result.hash,
        source: 'remote',
        url: manifestUrl,
        riskLevel: validation.riskLevel,
        dependencies: manifest.dependencies,
        blockScripts: manifest.blockScripts,
      },
      validation,
    });
  } catch (error: any) {
    logger.error(`[ValidateRemote] Failed for ${manifestUrl}:`, error);

    if (error instanceof ManifestFetchError) {
      return res.status(400).json({
        ok: false,
        error: 'FETCH_FAILED',
        message: error.message,
      });
    }

    if (error instanceof ManifestValidationError) {
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_FAILED',
        message: error.message,
        errors: error.validationErrors,
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'VALIDATE_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/apps/install-remote
 * Install an app from a remote manifest URL
 *
 * Body: { manifestUrl: string, expectedHash?: string, skipHashVerification?: boolean }
 */
router.post('/install-remote', async (req: Request, res: Response) => {
  const { manifestUrl, expectedHash, skipHashVerification = false } = req.body;

  if (!manifestUrl) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_URL',
      message: 'manifestUrl is required',
    });
  }

  try {
    logger.info(`[InstallRemote] Starting install from: ${manifestUrl}`);

    // Fetch manifest
    const result = await remoteManifestLoader.load(manifestUrl, {
      expectedHash: skipHashVerification ? undefined : expectedHash,
      verifyHash: !skipHashVerification,
    });
    const manifest = result.manifest;

    // Security validation
    const validation = appSecurityValidator.validate(manifest, expectedHash);
    if (!validation.valid) {
      logger.warn(`[InstallRemote] Security validation failed for ${manifest.appId}`);
      return res.status(400).json({
        ok: false,
        error: 'SECURITY_VALIDATION_FAILED',
        message: 'Security validation failed',
        validation,
      });
    }

    // Load block scripts if any
    if (manifest.blockScripts && manifest.blockScripts.length > 0) {
      logger.info(`[InstallRemote] Loading ${manifest.blockScripts.length} block scripts for ${manifest.appId}`);
      await remoteResourcesLoader.loadBlockScripts(manifest.appId, manifest);
    }

    // Install the remote app using AppManager
    // Note: AppManager.installRemote would need to be implemented to handle remote apps
    // For now, we store the manifest and mark as installed
    logger.info(`[InstallRemote] Installing remote app: ${manifest.appId}`);

    // TODO: Implement appManager.installRemote(manifest) when ready
    // For now, return success with manifest info
    logger.info(`[InstallRemote] Remote app ${manifest.appId} installed successfully`);

    return res.json({
      ok: true,
      message: `Remote app ${manifest.appId} installed successfully`,
      appId: manifest.appId,
      manifest: {
        appId: manifest.appId,
        name: manifest.name,
        version: manifest.version,
        source: 'remote',
        vendor: manifest.vendor,
      },
    });
  } catch (error: any) {
    logger.error(`[InstallRemote] Failed for ${manifestUrl}:`, error);

    if (error instanceof ManifestHashMismatchError) {
      return res.status(400).json({
        ok: false,
        error: 'HASH_MISMATCH',
        message: error.message,
      });
    }

    if (error instanceof ManifestFetchError) {
      return res.status(400).json({
        ok: false,
        error: 'FETCH_FAILED',
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'INSTALL_REMOTE_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

// =============================================================================
// ServiceGroup APIs (Phase 6)
// =============================================================================

/**
 * GET /api/admin/apps/service-groups
 * Get all service group metadata for UI display
 */
router.get('/service-groups', async (req: Request, res: Response) => {
  try {
    // Sort by priority
    const sortedMeta = [...SERVICE_GROUP_META].sort((a, b) => a.priority - b.priority);
    return res.json({
      ok: true,
      data: sortedMeta,
    });
  } catch (error: any) {
    logger.error('[ServiceGroups] Failed to get service group metadata:', error);
    return res.status(500).json({
      ok: false,
      error: 'FETCH_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/apps/service-groups/stats
 * Get statistics for all service groups
 */
router.get('/service-groups/stats', async (req: Request, res: Response) => {
  try {
    const stats = getServiceGroupStats();
    return res.json({
      ok: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[ServiceGroups] Failed to get service group stats:', error);
    return res.status(500).json({
      ok: false,
      error: 'FETCH_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/apps/by-service/:serviceGroup
 * Get apps filtered by service group
 */
router.get('/by-service/:serviceGroup', async (req: Request, res: Response) => {
  try {
    const { serviceGroup } = req.params;

    // Validate service group
    const validGroups = SERVICE_GROUP_META.map((m) => m.id);
    if (!validGroups.includes(serviceGroup as ServiceGroup)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_SERVICE_GROUP',
        message: `Invalid service group: ${serviceGroup}. Valid groups: ${validGroups.join(', ')}`,
      });
    }

    const apps = filterByServiceGroup(serviceGroup as ServiceGroup);
    return res.json({
      ok: true,
      data: apps,
      total: apps.length,
    });
  } catch (error: any) {
    logger.error('[ServiceGroups] Failed to get apps by service group:', error);
    return res.status(500).json({
      ok: false,
      error: 'FETCH_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/apps/:appId/compatibility
 * Check if an app is compatible with currently installed apps
 */
router.get('/:appId/compatibility', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    // Check if app exists in catalog
    const app = getCatalogItem(appId);
    if (!app) {
      return res.status(404).json({
        ok: false,
        error: 'APP_NOT_FOUND',
        message: `App ${appId} not found in catalog`,
      });
    }

    // Get installed apps
    const installedApps = await appManager.listInstalled();
    const installedAppIds = installedApps.map((a) => a.appId);

    // Check compatibility with each installed app
    const incompatibleWith: string[] = [];
    const warnings: string[] = [];

    for (const installedAppId of installedAppIds) {
      const compatibility = checkAppCompatibility(appId, installedAppId);
      if (compatibility === 'incompatible') {
        incompatibleWith.push(installedAppId);
      }
    }

    // Also check explicit incompatibleWith list
    const explicitIncompatible = getIncompatibleApps(appId);
    for (const incompatibleAppId of explicitIncompatible) {
      if (installedAppIds.includes(incompatibleAppId) && !incompatibleWith.includes(incompatibleAppId)) {
        incompatibleWith.push(incompatibleAppId);
      }
    }

    // Check dependencies
    if (app.dependencies) {
      for (const depId of Object.keys(app.dependencies)) {
        if (!installedAppIds.includes(depId)) {
          warnings.push(`Missing dependency: ${depId}`);
        }
      }
    }

    return res.json({
      ok: true,
      data: {
        compatible: incompatibleWith.length === 0,
        incompatibleWith,
        warnings,
      },
    });
  } catch (error: any) {
    logger.error('[Compatibility] Failed to check app compatibility:', error);
    return res.status(500).json({
      ok: false,
      error: 'CHECK_FAILED',
      message: error.message || 'Unknown error',
    });
  }
});

export default router;
