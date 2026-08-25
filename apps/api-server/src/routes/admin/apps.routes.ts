import { Router, Request, Response, NextFunction } from 'express';
import { AppManager } from '../../services/AppManager.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/auth.middleware.js';
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
import { disabledAppsRegistry, getDisabledAppsSummary } from '../../app-manifests/disabled-apps.registry.js';
import { isNewerVersion } from '../../utils/semver.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// All admin app routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Lazy-initialized singleton to avoid accessing AppDataSource before it's initialized
let _appManager: AppManager | null = null;
const getAppManager = (): AppManager => {
  if (!_appManager) {
    _appManager = new AppManager();
  }
  return _appManager;
};

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
    const apps = await getAppManager().listInstalled();

    // Enrich each app with update information and ownership data
    const enrichedApps = apps.map(app => {
      const catalogItem = getCatalogItem(app.appId);
      const availableVersion = catalogItem?.version || app.version;
      const hasUpdate = catalogItem ? isNewerVersion(app.version, catalogItem.version) : false;

      // WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1:
      //   ownsTables / ownsCPT / ownsACF 는 `app-manifests/index.ts` 의 manifestRegistry 에서
      //   파생됐으나 그 레지스트리는 Phase R1 이후 비어 있어 항상 빈 배열이었다.
      //   레지스트리를 제거하면서 이 세 필드도 응답에서 뺀다(admin-dashboard 소비 0).
      return {
        ...app,
        availableVersion,
        hasUpdate,
      };
    });

    res.json({ apps: enrichedApps });
  } catch (error) {
    next(error);
  }
});

/**
 * WO-O4O-ADMIN-APPS-SERVICE-GROUPS-ROUTE-ORDER-FIX-V1
 *
 * ⚠️ 아래 `/:appId` 는 **정적 경로를 모두 흡수하는 catch-all** 이다.
 *    Express 는 선언 순서대로 매칭하므로, `/:appId` 뒤에 선언된 정적 경로
 *    (`/service-groups`, `/service-groups/stats`, `/by-service/:serviceGroup`)는
 *    appId='service-groups' 등으로 잡혀 "앱 없음" 404 가 났다.
 *    (관측: admin 앱스토어 화면에서 GET /api/v1/admin/apps/service-groups → 404)
 *    → 정적 경로를 `/:appId` **앞으로** 이동한다. 핸들러 로직·응답 계약은 변경 없음.
 *
 * 신규 정적 경로를 추가할 때는 반드시 이 지점보다 위에 선언할 것.
 */

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
 * GET /api/admin/apps/:appId
 * Get specific app status
 */
router.get('/:appId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.params;
    const app = await getAppManager().getAppStatus(appId);

    if (!app) {
      return res.status(404).json({ error: `App ${appId} not found` });
    }

    res.json({ app });
  } catch (error) {
    next(error);
  }
});

/**
 * WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1
 *   (판정 ADMIN_APPS_WRITE_RETIRE)
 *
 * `/api/v1/admin/apps` 의 write 8종을 제거했다.
 *   POST /install · /activate · /deactivate · /uninstall · /update · /rollback
 *   POST /validate-remote · /install-remote
 *
 * 근거(실측):
 *   - frontend consumer 0 — admin-dashboard 는 WO-APPSTORE-UI-DEMOTION 이후 READ-ONLY 이고,
 *     API 클라이언트에만 정의가 남아 있었다(호출 0). 해당 클라이언트 메서드도 함께 제거했다.
 *   - production 30일 로그의 write 호출 0건.
 *   - `app_registry` 6행 전부 `updatedAt` == `installedAt` == 2026-01-22T04:36:28.617Z
 *     (migration 2026012200002-SeedDefaultApps) — seed 이후 write 가 한 번도 일어난 적이 없다.
 *   - lifecycle hook 은 `app-manifests/index.ts` 의 manifestRegistry 가 Phase R1 에서 비워진 뒤
 *     `hasManifest()` 가 항상 false 라 install/activate/uninstall 의 CPT·ACF·migration·purge
 *     분기가 전부 no-op 이었다. 즉 write 의 유일한 실효는 DB status 문자열 변경뿐이었다.
 *
 * 유지: read 9종 · `app_registry` 테이블 · `/api/v1/apps/availability`(메뉴 게이팅 실사용).
 * DB schema · row 는 건드리지 않았다(migration 0 / production write 0).
 */

/**
 * GET /api/admin/apps/:appId/version-info
 * Get version information for an app (current, previous, available versions)
 */
router.get('/:appId/version-info', async (req: Request, res: Response) => {
  const { appId } = req.params;

  try {
    const versionInfo = await getAppManager().getVersionInfo(appId);

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

// =============================================================================
// ServiceGroup APIs (Phase 6)
// =============================================================================

/**
 * WO-O4O-ADMIN-APPS-SERVICE-GROUPS-ROUTE-ORDER-FIX-V1:
 *   `/service-groups` 와 `/service-groups/stats` 는 `/:appId` 보다 위(파일 상단)로 이동했다.
 *   여기서 다시 선언하면 중복이므로 제거한다.
 *
 * 아래 `/by-service/:serviceGroup` 은 정적 접두어(`by-service`)를 가져
 * `/:appId` 와 충돌하지 않는다(단일 세그먼트 매칭이므로 흡수되지 않음) — 위치 유지.
 */

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
    const installedApps = await getAppManager().listInstalled();
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
