/**
 * Membership-Yaksa Routes
 *
 * Router factories that create routes with DataSource
 *
 * WO-O4O-ADMIN-INDIVIDUAL-API-ACCESS-BOUNDARY-CORRECTION-V1 — 경로 접두 주석 정정
 *   이 패키지 전체의 JSDoc 주석은 `/api/membership/...` 로 적혀 있으나 사실과 다르다.
 *   실제 마운트는 `app.use('/api/v1/membership', createMembershipRoutes(dataSource))`
 *   (apps/api-server/src/bootstrap/register-routes.ts) 이므로 canonical 접두는
 *   **`/api/v1/membership`** 이다.
 *   프런트(authClient)의 baseURL 은 이미 `.../api/v1` 로 끝나므로 호출 경로는
 *   `/membership/...` 로 시작해야 한다. `/api/membership/...` 로 호출하면
 *   `/api/v1/api/membership/...` 이 되어 403 이 아니라 404 가 난다.
 *   (아래 개별 파일 주석의 `/api/membership/...` 표기는 모두 이 규칙으로 읽을 것.)
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
