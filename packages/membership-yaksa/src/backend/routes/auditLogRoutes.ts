/**
 * Membership-Yaksa Audit Log Routes
 *
 * /api/membership/audit-logs
 *
 * Phase 2: 회원 변경 이력 관리 라우트
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AuditLogController } from '../controllers/AuditLogController.js';
import { AuditLogService } from '../services/AuditLogService.js';

export function createAuditLogRoutes(dataSource: DataSource): Router {
  const router = Router();
  const auditLogService = new AuditLogService(dataSource);
  const auditLogController = new AuditLogController(auditLogService);

  /**
   * GET /api/membership/audit-logs
   * 전체 감사 로그 조회 (필터링)
   */
  router.get('/', (req, res) => auditLogController.list(req, res));

  /**
   * GET /api/membership/audit-logs/recent
   * 최근 변경 이력 조회
   */
  router.get('/recent', (req, res) => auditLogController.getRecent(req, res));

  /**
   * GET /api/membership/audit-logs/stats
   * 변경 통계 조회
   */
  router.get('/stats', (req, res) => auditLogController.getStats(req, res));

  /**
   * GET /api/membership/audit-logs/:id
   * 감사 로그 상세 조회
   */
  router.get('/:id', (req, res) => auditLogController.get(req, res));

  return router;
}
