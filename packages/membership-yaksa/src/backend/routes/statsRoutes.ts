/**
 * Membership-Yaksa Stats Routes
 *
 * /api/membership/stats
 *
 * Phase 2: 확장 대시보드 통계 라우트 추가
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { StatsController } from '../controllers/StatsController.js';
import { StatsService } from '../services/StatsService.js';

export function createStatsRoutes(dataSource: DataSource): Router {
  const router = Router();
  const statsService = new StatsService(dataSource);
  const statsController = new StatsController(statsService);

  /**
   * GET /api/membership/stats
   * 기본 대시보드 통계
   */
  router.get('/', (req, res) => statsController.getDashboardStats(req, res));

  /**
   * GET /api/membership/stats/extended
   * Phase 2: 확장 대시보드 통계
   */
  router.get('/extended', (req, res) => statsController.getExtendedDashboardStats(req, res));

  /**
   * GET /api/membership/stats/pharmacist-types
   * 약사 유형별 통계
   */
  router.get('/pharmacist-types', (req, res) => statsController.getPharmacistTypeBreakdown(req, res));

  /**
   * GET /api/membership/stats/official-roles
   * 직책별 통계
   */
  router.get('/official-roles', (req, res) => statsController.getOfficialRoleBreakdown(req, res));

  /**
   * GET /api/membership/stats/gender
   * 성별 분포 통계
   */
  router.get('/gender', (req, res) => statsController.getGenderBreakdown(req, res));

  /**
   * GET /api/membership/stats/executives
   * 임원 통계
   */
  router.get('/executives', (req, res) => statsController.getExecutiveStats(req, res));

  /**
   * GET /api/membership/stats/fees
   * 연회비 통계
   */
  router.get('/fees', (req, res) => statsController.getFeeStats(req, res));

  /**
   * GET /api/membership/stats/recent-activity
   * 최근 활동 통계
   */
  router.get('/recent-activity', (req, res) => statsController.getRecentActivityStats(req, res));

  /**
   * GET /api/membership/stats/organization/:organizationId
   * 조직별 회원 요약 통계
   */
  router.get('/organization/:organizationId', (req, res) => statsController.getOrganizationSummary(req, res));

  return router;
}
