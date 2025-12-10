/**
 * Report Routes
 *
 * 신상신고서 관리 API 라우트 정의
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { AnnualReportController } from '../controllers/AnnualReportController.js';
import { AnnualReportService } from '../services/AnnualReportService.js';
import { MembershipSyncService } from '../services/MembershipSyncService.js';

/**
 * Create Report Routes (Member + Admin)
 */
export function createReportRoutes(dataSource: DataSource): Router {
  const router = Router();
  const reportService = new AnnualReportService(dataSource);
  const syncService = new MembershipSyncService(dataSource);
  const controller = new AnnualReportController(reportService, syncService);

  // ===== 회원용 라우트 =====

  // 내 신고서 조회 (현재 연도)
  router.get('/my-report', (req, res) => controller.getMyReport(req, res));

  // 내 신고서 목록
  router.get('/my-reports', (req, res) => controller.getMyReports(req, res));

  // 내 신고서 생성
  router.post('/my-report', (req, res) => controller.createMyReport(req, res));

  // 내 신고서 수정
  router.put('/my-report', (req, res) => controller.updateMyReport(req, res));

  // 내 신고서 제출
  router.post('/my-report/submit', (req, res) =>
    controller.submitMyReport(req, res)
  );

  // 내 신고서 로그 조회
  router.get('/my-report/:id/logs', (req, res) =>
    controller.getMyReportLogs(req, res)
  );

  // ===== 관리자용 라우트 =====

  // 신고서 목록 조회
  router.get('/reports', (req, res) => controller.list(req, res));

  // 통계 조회
  router.get('/reports/stats', (req, res) => controller.getStats(req, res));

  // 신고서 상세 조회
  router.get('/reports/:id', (req, res) => controller.get(req, res));

  // 신고서 로그 조회
  router.get('/reports/:id/logs', (req, res) => controller.getLogs(req, res));

  // 동기화 미리보기
  router.get('/reports/:id/sync-preview', (req, res) =>
    controller.getSyncPreview(req, res)
  );

  // 승인
  router.patch('/reports/:id/approve', (req, res) =>
    controller.approve(req, res)
  );

  // 반려
  router.patch('/reports/:id/reject', (req, res) =>
    controller.reject(req, res)
  );

  // 수정 요청
  router.patch('/reports/:id/request-revision', (req, res) =>
    controller.requestRevision(req, res)
  );

  // 수동 동기화
  router.post('/reports/:id/sync', (req, res) =>
    controller.manualSync(req, res)
  );

  // 일괄 동기화
  router.post('/sync-all', (req, res) => controller.syncAll(req, res));

  return router;
}

// ===== Route Definitions (for documentation/metadata) =====

export const memberReportRoutes = [
  {
    method: 'GET',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.getMyReport',
    permission: 'reporting.my.read',
    description: '내 신상신고서 조회',
  },
  {
    method: 'GET',
    path: '/api/reporting/my-reports',
    handler: 'AnnualReportController.getMyReports',
    permission: 'reporting.my.read',
    description: '내 모든 신상신고서 목록',
  },
  {
    method: 'POST',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.createMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 생성',
  },
  {
    method: 'PUT',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.updateMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 수정',
  },
  {
    method: 'POST',
    path: '/api/reporting/my-report/submit',
    handler: 'AnnualReportController.submitMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 제출',
  },
  {
    method: 'GET',
    path: '/api/reporting/my-report/:id/logs',
    handler: 'AnnualReportController.getMyReportLogs',
    permission: 'reporting.my.read',
    description: '내 신상신고서 로그 조회',
  },
];

export const adminReportRoutes = [
  {
    method: 'GET',
    path: '/api/reporting/reports',
    handler: 'AnnualReportController.list',
    permission: 'reporting.admin.read',
    description: '신상신고서 목록 조회 (관리자)',
  },
  {
    method: 'GET',
    path: '/api/reporting/reports/stats',
    handler: 'AnnualReportController.getStats',
    permission: 'reporting.admin.read',
    description: '신상신고서 통계',
  },
  {
    method: 'GET',
    path: '/api/reporting/reports/:id',
    handler: 'AnnualReportController.get',
    permission: 'reporting.admin.read',
    description: '신상신고서 상세 조회 (관리자)',
  },
  {
    method: 'GET',
    path: '/api/reporting/reports/:id/logs',
    handler: 'AnnualReportController.getLogs',
    permission: 'reporting.admin.read',
    description: '신상신고서 로그 조회 (관리자)',
  },
  {
    method: 'GET',
    path: '/api/reporting/reports/:id/sync-preview',
    handler: 'AnnualReportController.getSyncPreview',
    permission: 'reporting.admin.read',
    description: '동기화 미리보기',
  },
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/approve',
    handler: 'AnnualReportController.approve',
    permission: 'reporting.admin.approve',
    description: '신상신고서 승인',
  },
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/reject',
    handler: 'AnnualReportController.reject',
    permission: 'reporting.admin.approve',
    description: '신상신고서 반려',
  },
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/request-revision',
    handler: 'AnnualReportController.requestRevision',
    permission: 'reporting.admin.approve',
    description: '신상신고서 수정 요청',
  },
  {
    method: 'POST',
    path: '/api/reporting/reports/:id/sync',
    handler: 'AnnualReportController.manualSync',
    permission: 'reporting.admin.sync',
    description: '수동 동기화',
  },
  {
    method: 'POST',
    path: '/api/reporting/sync-all',
    handler: 'AnnualReportController.syncAll',
    permission: 'reporting.admin.sync',
    description: '미동기화 신고서 일괄 동기화',
  },
];

export const reportRoutes = [...memberReportRoutes, ...adminReportRoutes];
