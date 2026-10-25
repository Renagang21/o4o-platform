/**
 * SupplierManagementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/register, supplier/dashboard/*, supplier/profile/*
 */
import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { SupplierOnboardingService } from '../services/supplier-onboarding.service.js';
import { SupplierRegulatedCategoryService } from '../services/supplier-regulated-category.service.js';

import { createSupplierReviewHandlers } from './supplier-review-handlers.js';
import { createSupplierRegistrationHandlers } from './supplier-management/registration-handlers.js';
import { createSupplierProfileHandlers } from './supplier-management/profile-handlers.js';
import { createSupplierOnboardingHandlers } from './supplier-management/onboarding-handlers.js';
import { createSupplierCategoryHandlers } from './supplier-management/category-handlers.js';

export function createSupplierManagementController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const onboardingService = new SupplierOnboardingService(dataSource);
  const regulatedCategoryService = new SupplierRegulatedCategoryService(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  const registrationHandlers = createSupplierRegistrationHandlers(netureService);
  const profileHandlers = createSupplierProfileHandlers(netureService);
  const onboardingHandlers = createSupplierOnboardingHandlers(onboardingService);
  const categoryHandlers = createSupplierCategoryHandlers(regulatedCategoryService);

  const review = createSupplierReviewHandlers(dataSource);
  router.get('/review-requests', requireAuth, requireLinkedSupplier as RequestHandler, review.ownList);
  router.post('/review-requests/:requestId/submit', requireAuth, requireLinkedSupplier as RequestHandler, review.submit);


  // POST /supplier/register
  router.post('/register', requireAuth, registrationHandlers.register);

  // GET /supplier/dashboard/summary
  router.get(
    '/dashboard/summary',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    registrationHandlers.dashboard,
  );

  // GET /supplier/profile
  router.get(
    '/profile',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    profileHandlers.getProfile,
  );

  // GET /supplier/onboarding
  // WO-O4O-SUPPLIER-ONBOARDING-BASIC-DOCUMENTS-AND-SETTLEMENT-V1
  router.get(
    '/onboarding',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    onboardingHandlers.getOnboarding,
  );

  // PATCH /supplier/onboarding
  router.patch(
    '/onboarding',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    onboardingHandlers.updateOnboarding,
  );

  // POST /supplier/documents/:documentType
  router.post(
    '/documents/:documentType',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    uploadSingleMiddleware('file'),
    onboardingHandlers.uploadDocument,
  );

  // GET /supplier/documents/:documentType/download
  router.get(
    '/documents/:documentType/download',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    onboardingHandlers.downloadDocument,
  );

  // ==================== 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1) ====================
  //
  // WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 closeout (2026-09-23):
  //   프로필 단계는 선택-only 로 정리되었다. 소비처 0 이던 orphan endpoint 3건을 제거한다:
  //     GET   /supplier/profile/completeness
  //     PATCH /supplier/regulated-categories/:category        (번호 입력)
  //     POST  /supplier/regulated-categories/:category/submit (검토 요청)
  //   품목군 자체는 유지된다 — 목록·선택·선택해제·증빙 업로드/다운로드 및 Operator/Admin 검토 API.
  //   증빙 업로드(uploadEvidence)가 status 를 'submitted' 로 올리므로 검토 흐름은 그대로 살아 있다.

  // GET /supplier/regulated-categories — 공급자 본인 품목군 목록
  router.get(
    '/regulated-categories',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    categoryHandlers.list,
  );

  // POST /supplier/regulated-categories — 품목군 선택(행 생성) body: { category }
  router.post(
    '/regulated-categories',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    categoryHandlers.select,
  );

  // DELETE /supplier/regulated-categories/:category — 선택 해제(검토중/승인/제한은 잠금)
  router.delete(
    '/regulated-categories/:category',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    categoryHandlers.remove,
  );

  // POST /supplier/regulated-categories/:category/document — 증빙 PDF 업로드
  router.post(
    '/regulated-categories/:category/document',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    uploadSingleMiddleware('file'),
    categoryHandlers.uploadEvidence,
  );

  // GET /supplier/regulated-categories/:category/document/download — 증빙 열람
  router.get(
    '/regulated-categories/:category/document/download',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    categoryHandlers.downloadEvidence,
  );

  // PATCH /supplier/profile
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // requireActiveSupplier → requireLinkedSupplier. 프로필 저장은 승인 상태와 무관한 자기 정보 보완이며,
  // ACTIVE 게이트를 걸면 승인 전 공급자가 안내받은 정보를 스스로 입력할 수 없는 교착이 생긴다
  // (GET /profile · PATCH /onboarding 과 동일 레벨로 정합화).
  router.patch(
    '/profile',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    profileHandlers.updateProfile,
  );

  return router;
}
