/**
 * Membership-Yaksa Affiliation Routes
 *
 * /api/membership/affiliations
 *
 * Phase 2: 조직 소속 관리 라우트
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AffiliationController } from '../controllers/AffiliationController.js';
import { AffiliationService } from '../services/AffiliationService.js';

export function createAffiliationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const affiliationService = new AffiliationService(dataSource);
  const affiliationController = new AffiliationController(affiliationService);

  /**
   * PUT /api/membership/affiliations/:id
   * 소속 정보 수정
   */
  router.put('/:id', (req, res) => affiliationController.update(req, res));

  /**
   * DELETE /api/membership/affiliations/:id
   * 소속 삭제
   */
  router.delete('/:id', (req, res) => affiliationController.delete(req, res));

  return router;
}

/**
 * 회원별 소속 관리 라우트
 * /api/membership/members/:memberId/affiliations
 */
export function createMemberAffiliationRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });
  const affiliationService = new AffiliationService(dataSource);
  const affiliationController = new AffiliationController(affiliationService);

  /**
   * GET /api/membership/members/:memberId/affiliations
   * 회원의 소속 목록 조회
   */
  router.get('/', (req, res) => affiliationController.listByMember(req, res));

  /**
   * POST /api/membership/members/:memberId/affiliations
   * 회원 소속 추가
   */
  router.post('/', (req, res) => affiliationController.create(req, res));

  /**
   * GET /api/membership/members/:memberId/primary-affiliation
   * 회원의 주 소속 조회
   */
  router.get('/primary', (req, res) => affiliationController.getPrimaryAffiliation(req, res));

  /**
   * POST /api/membership/members/:memberId/primary-affiliation
   * 주 소속 할당
   */
  router.post('/primary', (req, res) => affiliationController.assignPrimaryAffiliation(req, res));

  /**
   * POST /api/membership/members/:memberId/transfer
   * 조직 이동 (Transfer)
   */
  router.post('/transfer', (req, res) => affiliationController.transferAffiliation(req, res));

  /**
   * POST /api/membership/members/:memberId/position
   * 직책 변경
   */
  router.post('/position', (req, res) => affiliationController.changePosition(req, res));

  /**
   * GET /api/membership/members/:memberId/affiliation-history
   * 회원의 조직 변경 이력 조회
   */
  router.get('/history', (req, res) => affiliationController.getAffiliationHistory(req, res));

  return router;
}

/**
 * 조직별 회원 관리 라우트
 * /api/membership/organizations/:organizationId/members
 */
export function createOrganizationMemberRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });
  const affiliationService = new AffiliationService(dataSource);
  const affiliationController = new AffiliationController(affiliationService);

  /**
   * GET /api/membership/organizations/:organizationId/members
   * 조직의 회원 목록 조회
   */
  router.get('/', (req, res) => affiliationController.listByOrganization(req, res));

  /**
   * GET /api/membership/organizations/:organizationId/affiliation-history
   * 조직의 회원 변경 이력 조회
   */
  router.get('/history', (req, res) => affiliationController.getOrganizationAffiliationHistory(req, res));

  return router;
}
