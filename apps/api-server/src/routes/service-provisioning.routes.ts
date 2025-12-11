/**
 * Service Provisioning Routes
 * Phase 7 — Service Templates & App Installer Automation
 *
 * API endpoints for service provisioning and template management
 */

import { Router, Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { templateRegistry } from '../service-templates/template-registry.js';
import { serviceInstaller } from '../service-templates/service-installer.js';
import type {
  ServiceProvisioningRequest,
  ServiceTemplate,
} from '../service-templates/template-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

const router = Router();

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
