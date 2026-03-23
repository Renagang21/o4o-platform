/**
 * KPA Branch Admin Dashboard Controller
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1: 분회 운영자용 대시보드 API
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope 표준화
 * WO-O4O-BRANCH-ADMIN-DASHBOARD-CONTROLLER-SPLIT-V1: handler 분리
 * - 분회 단위 통계 제공
 * - 소속 분회 범위 내 데이터만 조회
 * - "요약 → 이동" 패턴 지원
 */

import { Router, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireOrgRole } from '../middleware/kpa-org-role.middleware.js';
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';
import {
  createGetStatsHandler,
  createGetActivitiesHandler,
  createGetMemberStatsHandler,
  createListNewsHandler,
  createListMembersHandler,
  createListOfficersHandler,
  createListDocsHandler,
  createGetSettingsHandler,
} from './branch-admin-dashboard.query-handlers.js';
import {
  createCreateNewsHandler,
  createUpdateNewsHandler,
  createDeleteNewsHandler,
  createCreateOfficerHandler,
  createUpdateOfficerHandler,
  createDeleteOfficerHandler,
  createCreateDocHandler,
  createUpdateDocHandler,
  createDeleteDocHandler,
  createUpdateSettingsHandler,
  createUpdateSettingsStatusHandler,
} from './branch-admin-dashboard.mutation-handlers.js';

type AuthMiddleware = RequestHandler;

// WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: service-level scope guard
const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

export function createBranchAdminDashboardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: service scope → org role 2-layer guard
  // Layer 1: requireKpaScope — KPA 서비스 역할 확인 (security-core)
  // Layer 2: requireOrgRole('admin') — 분회 조직 역할 확인 (KpaMember.role >= admin)
  router.use(requireAuth);
  router.use(requireKpaScope('kpa:branch_admin'));
  router.use(requireOrgRole(dataSource, 'admin'));

  // Dashboard queries
  router.get('/dashboard/stats', createGetStatsHandler(dataSource));
  router.get('/dashboard/activities', createGetActivitiesHandler(dataSource));
  router.get('/dashboard/members', createGetMemberStatsHandler(dataSource));

  // News CRUD
  router.get('/news', createListNewsHandler(dataSource));
  router.post('/news', createCreateNewsHandler(dataSource));
  router.patch('/news/:id', createUpdateNewsHandler(dataSource));
  router.delete('/news/:id', createDeleteNewsHandler(dataSource));

  // Members (for officer selection dropdown)
  router.get('/members', createListMembersHandler(dataSource));

  // Officers CRUD
  router.get('/officers', createListOfficersHandler(dataSource));
  router.post('/officers', createCreateOfficerHandler(dataSource));
  router.patch('/officers/:id', createUpdateOfficerHandler(dataSource));
  router.delete('/officers/:id', createDeleteOfficerHandler(dataSource));

  // Docs CRUD
  router.get('/docs', createListDocsHandler(dataSource));
  router.post('/docs', createCreateDocHandler(dataSource));
  router.patch('/docs/:id', createUpdateDocHandler(dataSource));
  router.delete('/docs/:id', createDeleteDocHandler(dataSource));

  // Settings
  router.get('/settings', createGetSettingsHandler(dataSource));
  router.patch('/settings', createUpdateSettingsHandler(dataSource));
  router.patch('/settings/status', createUpdateSettingsStatusHandler(dataSource));

  return router;
}
