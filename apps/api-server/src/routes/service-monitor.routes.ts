/**
 * Service Monitoring Routes
 * Phase 9 Task 3 — Multi-Service Monitoring & Validation Dashboard
 *
 * Provides APIs for monitoring all services (tenants) in the platform:
 * - Tenant list with metadata
 * - Apps matrix per tenant
 * - Theme status
 * - Cross-service validation warnings
 * - Overall system summary
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { ServiceMonitorService } from '../services/service-monitor.service.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// All service monitor routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Create singleton instance
const serviceMonitor = new ServiceMonitorService();

/**
 * GET /api/v1/service/monitor/tenants
 * Get all tenants with their metadata
 */
router.get('/tenants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await serviceMonitor.getAllTenants();
    res.json({
      success: true,
      data: { tenants },
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get tenants:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/apps
 * Get apps matrix showing installed apps per tenant
 */
router.get('/apps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appsMatrix = await serviceMonitor.getAppsMatrix();
    res.json({
      success: true,
      data: appsMatrix,
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get apps matrix:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/themes
 * Get theme status for all tenants
 */
router.get('/themes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const themes = await serviceMonitor.getThemesStatus();
    res.json({
      success: true,
      data: { themes },
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get themes status:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/warnings
 * Get cross-service validation warnings
 */
router.get('/warnings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const warnings = await serviceMonitor.getValidationWarnings();
    res.json({
      success: true,
      data: { warnings },
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get warnings:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/summary
 * Get overall system summary
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await serviceMonitor.getSystemSummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get system summary:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/tenant/:tenantId
 * Get detailed info for a specific tenant
 */
router.get('/tenant/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const tenant = await serviceMonitor.getTenantDetails(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: `Tenant ${tenantId} not found`,
      });
    }

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to get tenant details:', error);
    next(error);
  }
});

/**
 * POST /api/v1/service/monitor/validate
 * Run validation check for all services
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = await serviceMonitor.runFullValidation();
    res.json({
      success: true,
      data: validationResult,
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to run validation:', error);
    next(error);
  }
});

/**
 * GET /api/v1/service/monitor/report
 * Generate and return validation report
 */
router.get('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = (req.query.format as string) || 'json';
    const report = await serviceMonitor.generateReport(format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=service-validation-report.csv');
      return res.send(report);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error('[ServiceMonitor] Failed to generate report:', error);
    next(error);
  }
});

export default router;
