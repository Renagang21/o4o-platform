/**
 * Template Routes
 *
 * 신상신고 템플릿 관리 API 라우트 정의
 */

export const templateRoutes = [
  // 목록 조회
  {
    method: 'GET',
    path: '/api/reporting/templates',
    handler: 'ReportTemplateController.list',
    permission: 'reporting.template.read',
    description: '템플릿 목록 조회',
  },

  // 현재 연도 활성 템플릿
  {
    method: 'GET',
    path: '/api/reporting/templates/current',
    handler: 'ReportTemplateController.getCurrent',
    permission: 'reporting.read',
    description: '현재 연도 활성 템플릿 조회',
  },

  // 연도별 조회
  {
    method: 'GET',
    path: '/api/reporting/templates/year/:year',
    handler: 'ReportTemplateController.getByYear',
    permission: 'reporting.template.read',
    description: '특정 연도 템플릿 조회',
  },

  // 상세 조회
  {
    method: 'GET',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.get',
    permission: 'reporting.template.read',
    description: '템플릿 상세 조회',
  },

  // 생성
  {
    method: 'POST',
    path: '/api/reporting/templates',
    handler: 'ReportTemplateController.create',
    permission: 'reporting.template.manage',
    description: '템플릿 생성',
  },

  // 수정
  {
    method: 'PUT',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.update',
    permission: 'reporting.template.manage',
    description: '템플릿 수정',
  },

  // 삭제
  {
    method: 'DELETE',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.delete',
    permission: 'reporting.template.manage',
    description: '템플릿 삭제',
  },

  // 활성화
  {
    method: 'PATCH',
    path: '/api/reporting/templates/:id/activate',
    handler: 'ReportTemplateController.activate',
    permission: 'reporting.template.manage',
    description: '템플릿 활성화',
  },

  // 비활성화
  {
    method: 'PATCH',
    path: '/api/reporting/templates/:id/deactivate',
    handler: 'ReportTemplateController.deactivate',
    permission: 'reporting.template.manage',
    description: '템플릿 비활성화',
  },

  // 복제
  {
    method: 'POST',
    path: '/api/reporting/templates/:id/duplicate',
    handler: 'ReportTemplateController.duplicate',
    permission: 'reporting.template.manage',
    description: '템플릿 복제 (새 연도용)',
  },
];
