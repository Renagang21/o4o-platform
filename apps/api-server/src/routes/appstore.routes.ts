/**
 * AppStore API Routes
 * Phase 5 — AppStore + Module Loader
 *
 * Provides REST endpoints for app lifecycle management:
 * - GET    /api/v1/appstore            - List all apps (catalog + status)   [PUBLIC_READ]
 * - GET    /api/v1/appstore/modules    - Loaded module registry (debug)     [PRIVILEGED_READ]
 * - GET    /api/v1/appstore/:appId     - Get app details                    [PUBLIC_READ]
 * - POST   /api/v1/appstore/install    - Install an app                     [PRIVILEGED_WRITE]
 * - POST   /api/v1/appstore/activate   - Activate an installed app          [PRIVILEGED_WRITE]
 * - POST   /api/v1/appstore/deactivate - Deactivate an active app           [PRIVILEGED_WRITE]
 * - DELETE /api/v1/appstore/uninstall  - Uninstall an app                   [PRIVILEGED_WRITE]
 *
 * WO-O4O-APPSTORE-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1
 *
 * 권한 계약 (§9):
 * - 카탈로그 목록/상세는 정적 카탈로그 메타데이터만 반환하며 사용자·조직 데이터를
 *   포함하지 않는다. 의도된 공개 조회이므로 PUBLIC_READ 로 유지한다.
 * - 상태 변경(install/activate/deactivate/uninstall)은 프로세스 전역 module registry 를
 *   변경한다. tenant 축(organizationId·serviceKey·instanceId)이 계약에 존재하지 않는
 *   플랫폼 전역 리소스이므로, DB 영속 경로인 `/api/v1/admin/apps`(authenticate +
 *   requireAdmin)와 동일한 플랫폼 관리자 경계를 적용한다. App Store 전용 인증 체계를
 *   새로 만들지 않고 공통 미들웨어를 그대로 재사용한다(§10).
 * - `GET /modules`는 registry 내부 상태(로드 실패 사유 포함)를 노출하는 디버그
 *   엔드포인트이므로 CLAUDE.md §8 에 따라 동일 가드를 적용한다.
 */

import { Router, Request, Response } from 'express';
import { appStoreService } from '../services/AppStoreService.js';
import { APPS_CATALOG, getCatalogItem, searchCatalog, filterByCategory, getCategories } from '../app-manifests/appsCatalog.js';
import { moduleLoader } from '../modules/module-loader.js';
import { AppStoreError } from '../services/AppStoreService.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * 플랫폼 관리자 가드 (§9·§10)
 *
 * `/api/v1/admin/apps` 와 동일한 조합을 재사용한다.
 * - 비인증 요청 → 401
 * - 인증됐지만 platform:super_admin 이 아님 → 403
 */
const requirePlatformAdmin = [authenticate, requireAdmin];

/**
 * AppStore 오류 → HTTP 상태 매핑 (§11·§12)
 *
 * AppStoreError 는 도메인이 정한 status/code 를 그대로 사용한다.
 * (카탈로그에 없는 app·미설치 app → 404, 의존성 누락 → 409)
 * 그 외 예기치 못한 오류만 500 으로 내린다.
 */
function respondWithAppStoreError(res: Response, error: unknown, fallbackError: string): Response {
  if (error instanceof AppStoreError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    success: false,
    error: fallbackError,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}

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
router.get('/modules', requirePlatformAdmin, async (req: Request, res: Response) => {
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
router.post('/install', requirePlatformAdmin, async (req: Request, res: Response) => {
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
    return respondWithAppStoreError(res, error, 'Failed to install app');
  }
});

/**
 * POST /api/v1/appstore/activate
 * Activate an installed app
 */
router.post('/activate', requirePlatformAdmin, async (req: Request, res: Response) => {
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
    return respondWithAppStoreError(res, error, 'Failed to activate app');
  }
});

/**
 * POST /api/v1/appstore/deactivate
 * Deactivate an active app
 */
router.post('/deactivate', requirePlatformAdmin, async (req: Request, res: Response) => {
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
    return respondWithAppStoreError(res, error, 'Failed to deactivate app');
  }
});

/**
 * DELETE /api/v1/appstore/uninstall
 * Uninstall an app
 */
router.delete('/uninstall', requirePlatformAdmin, async (req: Request, res: Response) => {
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
    return respondWithAppStoreError(res, error, 'Failed to uninstall app');
  }
});

export default router;
