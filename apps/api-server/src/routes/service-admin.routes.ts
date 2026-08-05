/**
 * Service Admin Routes
 * Phase 8 — Service Admin Dashboard
 *
 * API endpoints for service administration and monitoring.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
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

const router: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1
//
// 이 라우터는 `app.use('/api/v1/service-admin', serviceAdminRoutes)` 로 mount 되는데
// mount 지점에도, 라우터 안에도 인증 미들웨어가 없었다. `/api/v1` 에는 전역 인증이
// 없으므로(main.ts 에는 globalErrorHandler 뿐) 8개 endpoint 전부가 비로그인에 공개돼
// 있었다 — 프로덕션 GET 200 실측. 상세: docs/audits/O4O-ADMIN-AUTHORIZATION-ROLE-
// ROUTE-API-CONSISTENCY-AUDIT-V1.md (P0-1).
//
// 허용 역할을 platform 관리자로 한정하는 근거
//   - 이 라우터가 반환하는 것은 특정 서비스의 데이터가 아니라 **플랫폼 전역 레지스트리**
//     다: moduleLoader(설치 모듈), templateRegistry(서비스 템플릿), initPackRegistry,
//     themePresetService 의 기본 프리셋. 서비스 경계로 나눌 대상이 아니다.
//   - `tenantId` / `serviceGroup` 은 **요청자가 query·body 로 지정**하며 소유권 검사가
//     없다. tenant-context.middleware 는 어디에도 등록돼 있지 않아 `req.tenantId` 는
//     항상 undefined 다. 따라서 서비스 관리자에게 열면 임의 tenantId 를 지정해 다른
//     테넌트의 테마를 조회·변경할 수 있다(scope 로 좁힐 축이 없다).
//   - 저장소 전수 검색 결과 이 API 의 **소비처가 0건**이다(정의부 외 참조 없음).
//     정상 사용 중인 서비스 관리자 흐름이 존재하지 않으므로 최소 권한 적용의
//     기능 회귀 위험이 없다.
// 따라서 기존 canonical guard 를 그대로 재사용한다 — 신규 역할·permission 체계 없음.
// (`requireAdmin` = platform:super_admin, WO-O4O-REQUIREADMIN-
//  PREFIXED-ONLY-V1)
//
// 개별 endpoint 가 아니라 **router 수준**에 건다. 이후 추가되는 endpoint 도 자동으로
// 이 경계 아래에 놓인다(회귀 테스트가 이 순서를 고정한다).
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireAdmin);

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
