/**
 * yaksa-admin Routes (Phase 1: Read-Only APIs)
 *
 * Phase 1 기능:
 * - 조직(지부/분회) 조회 API
 * - 멤버 조회 API
 * - 임원 조회 API
 *
 * 라우트 구조:
 * /api/v1/yaksa-admin
 * ├─ /organizations   (조직 조회)
 * ├─ /divisions       (지부 목록)
 * ├─ /branches        (분회 목록)
 * ├─ /members         (멤버 조회)
 * ├─ /officers        (임원 조회)
 * └─ /users/:userId   (사용자별 조회)
 */

import type { Router } from 'express';
import { organizationController } from '../controllers/OrganizationController.js';
import { memberController } from '../controllers/MemberController.js';
import { officerController } from '../controllers/OfficerController.js';

/**
 * Phase 1: Read-Only API Routes
 */
export function createRoutes(router: Router): Router {
  console.log('[yaksa-admin] Routes Phase 1 loaded');

  // ===== Organization Routes =====
  // GET /api/v1/yaksa-admin/organizations
  router.get('/organizations', (req, res, next) =>
    organizationController.listOrganizations(req, res, next)
  );

  // GET /api/v1/yaksa-admin/organizations/:id
  router.get('/organizations/:id', (req, res, next) =>
    organizationController.getOrganization(req, res, next)
  );

  // GET /api/v1/yaksa-admin/organizations/:id/children
  router.get('/organizations/:id/children', (req, res, next) =>
    organizationController.getChildOrganizations(req, res, next)
  );

  // GET /api/v1/yaksa-admin/organizations/:organizationId/admins
  router.get('/organizations/:organizationId/admins', (req, res, next) =>
    memberController.getOrganizationAdmins(req, res, next)
  );

  // GET /api/v1/yaksa-admin/organizations/:organizationId/head
  router.get('/organizations/:organizationId/head', (req, res, next) =>
    officerController.getOrganizationHead(req, res, next)
  );

  // GET /api/v1/yaksa-admin/divisions
  router.get('/divisions', (req, res, next) =>
    organizationController.listDivisions(req, res, next)
  );

  // GET /api/v1/yaksa-admin/branches
  router.get('/branches', (req, res, next) =>
    organizationController.listBranches(req, res, next)
  );

  // ===== Member Routes =====
  // GET /api/v1/yaksa-admin/members
  router.get('/members', (req, res, next) =>
    memberController.listMembers(req, res, next)
  );

  // GET /api/v1/yaksa-admin/members/count
  router.get('/members/count', (req, res, next) =>
    memberController.getMemberCount(req, res, next)
  );

  // GET /api/v1/yaksa-admin/members/stats
  router.get('/members/stats', (req, res, next) =>
    memberController.getMemberStats(req, res, next)
  );

  // ===== Officer Routes =====
  // GET /api/v1/yaksa-admin/officers
  router.get('/officers', (req, res, next) =>
    officerController.listOfficers(req, res, next)
  );

  // GET /api/v1/yaksa-admin/officers/count
  router.get('/officers/count', (req, res, next) =>
    officerController.getOfficerCount(req, res, next)
  );

  // GET /api/v1/yaksa-admin/officers/stats
  router.get('/officers/stats', (req, res, next) =>
    officerController.getOfficerStats(req, res, next)
  );

  // GET /api/v1/yaksa-admin/officers/roles
  router.get('/officers/roles', (req, res, next) =>
    officerController.getOfficerRoleDefinitions(req, res, next)
  );

  // ===== User Routes =====
  // GET /api/v1/yaksa-admin/users/:userId/memberships
  router.get('/users/:userId/memberships', (req, res, next) =>
    memberController.getUserMemberships(req, res, next)
  );

  // GET /api/v1/yaksa-admin/users/:userId/officer-roles
  router.get('/users/:userId/officer-roles', (req, res, next) =>
    officerController.getUserOfficerRoles(req, res, next)
  );

  return router;
}

export default createRoutes;
