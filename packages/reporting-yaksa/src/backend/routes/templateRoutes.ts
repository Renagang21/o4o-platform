/**
 * Template Routes
 *
 * 신상신고 템플릿 관리 API 라우트 정의
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ReportTemplateController } from '../controllers/ReportTemplateController.js';
import { ReportTemplateService } from '../services/ReportTemplateService.js';

/**
 * Create Template Routes
 */
export function createTemplateRoutes(dataSource: DataSource): Router {
  const router = Router();
  const templateService = new ReportTemplateService(dataSource);
  const controller = new ReportTemplateController(templateService);

  // 목록 조회
  router.get('/', (req, res) => controller.list(req, res));

  // 현재 연도 활성 템플릿
  router.get('/current', (req, res) => controller.getCurrent(req, res));

  // 연도별 조회
  router.get('/year/:year', (req, res) => controller.getByYear(req, res));

  // 상세 조회
  router.get('/:id', (req, res) => controller.get(req, res));

  // 생성
  router.post('/', (req, res) => controller.create(req, res));

  // 수정
  router.put('/:id', (req, res) => controller.update(req, res));

  // 삭제
  router.delete('/:id', (req, res) => controller.delete(req, res));

  // 활성화
  router.patch('/:id/activate', (req, res) => controller.activate(req, res));

  // 비활성화
  router.patch('/:id/deactivate', (req, res) =>
    controller.deactivate(req, res)
  );

  // 복제
  router.post('/:id/duplicate', (req, res) => controller.duplicate(req, res));

  return router;
}

// ===== Route Definitions (for documentation/metadata) =====

export const templateRoutes = [
  {
    method: 'GET',
    path: '/api/reporting/templates',
    handler: 'ReportTemplateController.list',
    permission: 'reporting.template.read',
    description: '템플릿 목록 조회',
  },
  {
    method: 'GET',
    path: '/api/reporting/templates/current',
    handler: 'ReportTemplateController.getCurrent',
    permission: 'reporting.read',
    description: '현재 연도 활성 템플릿 조회',
  },
  {
    method: 'GET',
    path: '/api/reporting/templates/year/:year',
    handler: 'ReportTemplateController.getByYear',
    permission: 'reporting.template.read',
    description: '특정 연도 템플릿 조회',
  },
  {
    method: 'GET',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.get',
    permission: 'reporting.template.read',
    description: '템플릿 상세 조회',
  },
  {
    method: 'POST',
    path: '/api/reporting/templates',
    handler: 'ReportTemplateController.create',
    permission: 'reporting.template.manage',
    description: '템플릿 생성',
  },
  {
    method: 'PUT',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.update',
    permission: 'reporting.template.manage',
    description: '템플릿 수정',
  },
  {
    method: 'DELETE',
    path: '/api/reporting/templates/:id',
    handler: 'ReportTemplateController.delete',
    permission: 'reporting.template.manage',
    description: '템플릿 삭제',
  },
  {
    method: 'PATCH',
    path: '/api/reporting/templates/:id/activate',
    handler: 'ReportTemplateController.activate',
    permission: 'reporting.template.manage',
    description: '템플릿 활성화',
  },
  {
    method: 'PATCH',
    path: '/api/reporting/templates/:id/deactivate',
    handler: 'ReportTemplateController.deactivate',
    permission: 'reporting.template.manage',
    description: '템플릿 비활성화',
  },
  {
    method: 'POST',
    path: '/api/reporting/templates/:id/duplicate',
    handler: 'ReportTemplateController.duplicate',
    permission: 'reporting.template.manage',
    description: '템플릿 복제 (새 연도용)',
  },
];
