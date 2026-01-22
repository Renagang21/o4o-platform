/**
 * Membership-Yaksa Routes
 *
 * Router factories that create routes with DataSource
 *
 * Phase 2: 확장 라우트 추가
 * - auditLogRoutes: 변경 이력 관리
 * - affiliationRoutes: 조직 소속 관리
 * - licenseVerificationRoutes: 면허 검증
 */

export { createMemberRoutes } from './memberRoutes.js';
export { createCategoryRoutes } from './categoryRoutes.js';
export { createVerificationRoutes } from './verificationRoutes.js';
export { createStatsRoutes } from './statsRoutes.js';
export { createExportRoutes } from './exportRoutes.js';
export { createAuditLogRoutes } from './auditLogRoutes.js';
export {
  createAffiliationRoutes,
  createMemberAffiliationRoutes,
  createOrganizationMemberRoutes,
} from './affiliationRoutes.js';
export {
  createLicenseVerificationRoutes,
  createMemberLicenseVerificationRoutes,
} from './licenseVerificationRoutes.js';

/**
 * Create all membership routes
 *
 * This is a helper function for API server integration
 */
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createMemberRoutes } from './memberRoutes.js';
import { createCategoryRoutes } from './categoryRoutes.js';
import { createVerificationRoutes } from './verificationRoutes.js';
import { createStatsRoutes } from './statsRoutes.js';
import { createExportRoutes } from './exportRoutes.js';
import { createAuditLogRoutes } from './auditLogRoutes.js';
import {
  createAffiliationRoutes,
  createMemberAffiliationRoutes,
  createOrganizationMemberRoutes,
} from './affiliationRoutes.js';
import {
  createLicenseVerificationRoutes,
  createMemberLicenseVerificationRoutes,
} from './licenseVerificationRoutes.js';

export function createMembershipRoutes(dataSource: DataSource): Router {
  const router = Router();

  // /api/membership/categories
  router.use('/categories', createCategoryRoutes(dataSource));

  // /api/membership/members
  router.use('/members', createMemberRoutes(dataSource));

  // /api/membership/members/:memberId/affiliations
  router.use('/members/:memberId/affiliations', createMemberAffiliationRoutes(dataSource));

  // /api/membership/members/:memberId/logs (Audit Log)
  router.use('/members/:memberId/logs', (req, res, next) => {
    const { AuditLogController } = require('../controllers/AuditLogController.js');
    const { AuditLogService } = require('../services/AuditLogService.js');
    const auditLogService = new AuditLogService(dataSource);
    const auditLogController = new AuditLogController(auditLogService);
    auditLogController.getMemberLogs(req, res);
  });

  // /api/membership/members/:memberId/license-verification
  router.use('/members/:memberId/license-verification', createMemberLicenseVerificationRoutes(dataSource));

  // /api/membership/verifications
  router.use('/verifications', createVerificationRoutes(dataSource));

  // /api/membership/stats
  router.use('/stats', createStatsRoutes(dataSource));

  // /api/membership/export
  router.use('/export', createExportRoutes(dataSource));

  // Phase 2: 확장 라우트

  // /api/membership/audit-logs
  router.use('/audit-logs', createAuditLogRoutes(dataSource));

  // /api/membership/affiliations
  router.use('/affiliations', createAffiliationRoutes(dataSource));

  // /api/membership/organizations/:organizationId/members
  router.use('/organizations/:organizationId/members', createOrganizationMemberRoutes(dataSource));

  // /api/membership/license-verification
  router.use('/license-verification', createLicenseVerificationRoutes(dataSource));

  return router;
}
