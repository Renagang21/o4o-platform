/**
 * Report Routes
 *
 * 신상신고서 관리 API 라우트 정의
 */

// ===== 회원용 라우트 =====
export const memberReportRoutes = [
  // 내 신고서 조회 (현재 연도)
  {
    method: 'GET',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.getMyReport',
    permission: 'reporting.my.read',
    description: '내 신상신고서 조회',
  },

  // 내 신고서 목록
  {
    method: 'GET',
    path: '/api/reporting/my-reports',
    handler: 'AnnualReportController.getMyReports',
    permission: 'reporting.my.read',
    description: '내 모든 신상신고서 목록',
  },

  // 내 신고서 생성
  {
    method: 'POST',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.createMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 생성',
  },

  // 내 신고서 수정
  {
    method: 'PUT',
    path: '/api/reporting/my-report',
    handler: 'AnnualReportController.updateMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 수정',
  },

  // 내 신고서 제출
  {
    method: 'POST',
    path: '/api/reporting/my-report/submit',
    handler: 'AnnualReportController.submitMyReport',
    permission: 'reporting.my.write',
    description: '내 신상신고서 제출',
  },

  // 내 신고서 로그 조회
  {
    method: 'GET',
    path: '/api/reporting/my-report/:id/logs',
    handler: 'AnnualReportController.getMyReportLogs',
    permission: 'reporting.my.read',
    description: '내 신상신고서 로그 조회',
  },
];

// ===== 관리자용 라우트 =====
export const adminReportRoutes = [
  // 신고서 목록 조회
  {
    method: 'GET',
    path: '/api/reporting/reports',
    handler: 'AnnualReportController.list',
    permission: 'reporting.admin.read',
    description: '신상신고서 목록 조회 (관리자)',
  },

  // 통계 조회
  {
    method: 'GET',
    path: '/api/reporting/reports/stats',
    handler: 'AnnualReportController.getStats',
    permission: 'reporting.admin.read',
    description: '신상신고서 통계',
  },

  // 신고서 상세 조회
  {
    method: 'GET',
    path: '/api/reporting/reports/:id',
    handler: 'AnnualReportController.get',
    permission: 'reporting.admin.read',
    description: '신상신고서 상세 조회 (관리자)',
  },

  // 신고서 로그 조회
  {
    method: 'GET',
    path: '/api/reporting/reports/:id/logs',
    handler: 'AnnualReportController.getLogs',
    permission: 'reporting.admin.read',
    description: '신상신고서 로그 조회 (관리자)',
  },

  // 동기화 미리보기
  {
    method: 'GET',
    path: '/api/reporting/reports/:id/sync-preview',
    handler: 'AnnualReportController.getSyncPreview',
    permission: 'reporting.admin.read',
    description: '동기화 미리보기',
  },

  // 승인
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/approve',
    handler: 'AnnualReportController.approve',
    permission: 'reporting.admin.approve',
    description: '신상신고서 승인',
  },

  // 반려
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/reject',
    handler: 'AnnualReportController.reject',
    permission: 'reporting.admin.approve',
    description: '신상신고서 반려',
  },

  // 수정 요청
  {
    method: 'PATCH',
    path: '/api/reporting/reports/:id/request-revision',
    handler: 'AnnualReportController.requestRevision',
    permission: 'reporting.admin.approve',
    description: '신상신고서 수정 요청',
  },

  // 수동 동기화
  {
    method: 'POST',
    path: '/api/reporting/reports/:id/sync',
    handler: 'AnnualReportController.manualSync',
    permission: 'reporting.admin.sync',
    description: '수동 동기화',
  },

  // 일괄 동기화
  {
    method: 'POST',
    path: '/api/reporting/sync-all',
    handler: 'AnnualReportController.syncAll',
    permission: 'reporting.admin.sync',
    description: '미동기화 신고서 일괄 동기화',
  },
];

// 전체 라우트
export const reportRoutes = [...memberReportRoutes, ...adminReportRoutes];
