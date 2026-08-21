/**
 * Service Provisioning Routes
 * Phase 7 — Service Templates & App Installer Automation
 *
 * API endpoints for service provisioning and template management
 *
 * WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1
 *
 * 인증·인가 경계:
 *   본 라우터의 모든 endpoint 는 `authenticate` + `requireAdmin`(platform:super_admin) 를 요구한다.
 *
 *   - 이전에는 라우터·앱 어디에도 가드가 없어 **비로그인 요청이 write handler 본문까지 도달**했다.
 *     production 에서 실제 상태 변경이 일어나지 않은 이유는 배포 이미지에
 *     `service-templates/templates/*.json` 이 포함되지 않아 registry 가 비어 있었기 때문이며
 *     (ERROR_MAPPING_ONLY), 가드 부재 자체는 구조적 결함이었다.
 *   - read 를 공개로 두지 않는 이유: 템플릿은 소비자용 카탈로그가 아니라 내부 프로비저닝
 *     메타데이터(내부 app id·service group 구성)이고, 실 소비처는 super_admin 전용
 *     admin-dashboard `ServiceTemplateSelector` 뿐이며(비인증 소비처 0),
 *     동일 read 가 이미 가드된 `/api/v1/service-admin/{templates,stats}` 로도 제공된다.
 *   - 별도 role 체계를 만들지 않고 형제 라우터(`/api/v1/service/monitor`,
 *     `/api/v1/service-admin`, `/api/v1/admin/apps`)와 동일한 공통 middleware 를 재사용한다.
 *   - organizationId/tenantId 는 요청 body 로 들어오지만 super_admin(플랫폼 전역 권한) 전용이므로
 *     별도 tenant ownership 축을 새로 만들지 않는다.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';
import { templateRegistry } from '../service-templates/template-registry.js';
import { serviceInstaller } from '../service-templates/service-installer.js';
import type {
  ServiceProvisioningRequest,
  ServiceTemplate,
} from '../service-templates/template-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

const router: Router = Router();

// WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1:
//   모든 provisioning endpoint 는 인증 + platform:super_admin 을 요구한다.
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/v1/service/templates
 * Get all available service templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { serviceGroup, category, activeOnly } = req.query;

    let templates = templateRegistry.getAllTemplates();

    // Filter by service group
    if (serviceGroup && typeof serviceGroup === 'string') {
      templates = templates.filter(t => t.serviceGroup === serviceGroup);
    }

    // Filter by category
    if (category && typeof category === 'string') {
      templates = templates.filter(t => t.category === category);
    }

    // Filter active only
    if (activeOnly === 'true') {
      templates = templates.filter(t => t.isActive);
    }

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
    });
  }
});

/**
 * GET /api/v1/service/templates/:id
 * Get a specific template by ID
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = templateRegistry.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template ${id} not found`,
      });
    }

    // Get all apps info
    const apps = templateRegistry.getAllApps(id);

    res.json({
      success: true,
      data: {
        template,
        apps,
      },
    });
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to get template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template',
    });
  }
});

/**
 * GET /api/v1/service/templates/:id/preview
 * Preview what would be installed for a template
 */
router.get('/templates/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { installExtensions, skipApps, additionalExtensions } = req.query;

    const preview = serviceInstaller.getInstallationPreview(id, {
      installExtensions: installExtensions === 'true',
      skipApps: skipApps ? String(skipApps).split(',') : undefined,
      additionalExtensions: additionalExtensions ? String(additionalExtensions).split(',') : undefined,
    });

    if (!preview.template) {
      return res.status(404).json({
        success: false,
        error: `Template ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to get preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installation preview',
    });
  }
});

/**
 * POST /api/v1/service/create
 * Create/provision a new service based on a template
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      tenantId,
      serviceTemplateId,
      settingsOverride,
      additionalExtensions,
      skipApps,
    } = req.body as ServiceProvisioningRequest;

    // Validate required fields
    if (!organizationId || !tenantId || !serviceTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: organizationId, tenantId, serviceTemplateId',
      });
    }

    // Check template exists
    const template = templateRegistry.getTemplate(serviceTemplateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template ${serviceTemplateId} not found`,
      });
    }

    // Check template is active
    if (!template.isActive) {
      return res.status(400).json({
        success: false,
        error: `Template ${serviceTemplateId} is not active`,
      });
    }

    logger.info(`[ServiceProvisioning] Creating service: org=${organizationId}, tenant=${tenantId}, template=${serviceTemplateId}`);

    // Provision the service
    const result = await serviceInstaller.provisionService({
      organizationId,
      tenantId,
      serviceTemplateId,
      settingsOverride,
      additionalExtensions,
      skipApps,
    });

    if (result.success) {
      logger.info(`[ServiceProvisioning] Service created successfully: ${result.installedApps.length} apps installed`);
      res.status(201).json({
        success: true,
        data: result,
      });
    } else {
      logger.error(`[ServiceProvisioning] Service creation failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
        data: result,
      });
    }
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to create service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
    });
  }
});

/**
 * POST /api/v1/service/templates/:id/install
 * Install apps from a specific template
 */
router.post('/templates/:id/install', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { installExtensions, skipApps, additionalExtensions } = req.body;

    const result = await serviceInstaller.installServiceTemplate(id, {
      installExtensions,
      skipApps,
      additionalExtensions,
    });

    // WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1 (§13):
    //   존재하지 않는 template 은 서버 오류가 아니라 대상 없음이다 (기존 500 → 404).
    if (!result.template) {
      return res.status(404).json({
        success: false,
        error: `Template ${id} not found`,
      });
    }

    if (result.success) {
      res.json({
        success: true,
        data: {
          installed: result.installed,
          skipped: result.skipped,
          template: result.template,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Some apps failed to install',
        data: {
          installed: result.installed,
          skipped: result.skipped,
          failed: result.failed,
        },
      });
    }
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to install template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install template',
    });
  }
});

/**
 * GET /api/v1/service/templates/recommend/:serviceGroup
 * Get recommended templates for a service group
 */
router.get('/templates/recommend/:serviceGroup', async (req: Request, res: Response) => {
  try {
    const serviceGroup = req.params.serviceGroup as ServiceGroup;
    const templates = serviceInstaller.getRecommendedTemplates(serviceGroup);

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to get recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
    });
  }
});

/**
 * GET /api/v1/service/stats
 * Get template statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = templateRegistry.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[ServiceProvisioning] Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

export default router;
