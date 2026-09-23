/**
 * SupplierManagementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/register, supplier/dashboard/*, supplier/profile/*
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import {
  SupplierOnboardingService,
  type SupplierOnboardingDocumentType,
} from '../services/supplier-onboarding.service.js';
import { SupplierRegulatedCategoryService } from '../services/supplier-regulated-category.service.js';

export function createSupplierManagementController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const onboardingService = new SupplierOnboardingService(dataSource);
  const regulatedCategoryService = new SupplierRegulatedCategoryService(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // POST /supplier/register
  router.post('/register', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }
      const { name, slug, contactEmail } = req.body || {};
      const result = await netureService.registerSupplier(userId, { name, slug, contactEmail });
      if (!result.success) {
        const statusMap: Record<string, number> = {
          MISSING_NAME: 400,
          INVALID_SLUG: 400,
          USER_ALREADY_HAS_SUPPLIER: 409,
          SLUG_ALREADY_EXISTS: 409,
        };
        return res.status(statusMap[result.error!] || 400).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error registering supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register supplier' } });
    }
  });

  // GET /supplier/dashboard/summary
  router.get('/dashboard/summary', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const summary = await netureService.getSupplierDashboardSummary(supplierId);
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier dashboard summary:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard summary' });
    }
  });

  // GET /supplier/profile
  router.get('/profile', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const profile = await netureService.getSupplierProfile(supplierId);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier profile:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // GET /supplier/profile/completeness
  router.get('/profile/completeness', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await netureService.computeProfileCompleteness(supplierId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error fetching profile completeness:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // GET /supplier/onboarding
  // WO-O4O-SUPPLIER-ONBOARDING-BASIC-DOCUMENTS-AND-SETTLEMENT-V1
  router.get('/onboarding', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const data = await onboardingService.getOnboarding(supplierId);
      if (!data) {
        return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND' } });
      }
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier onboarding:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // PATCH /supplier/onboarding
  router.patch('/onboarding', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await onboardingService.updateOnboarding(supplierId, req.body || {});
      if (!result) {
        return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND' } });
      }
      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: result.error } });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error updating supplier onboarding:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /supplier/documents/:documentType
  router.post(
    '/documents/:documentType',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    uploadSingleMiddleware('file'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const documentType = req.params.documentType as SupplierOnboardingDocumentType;
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED' } });
        }
        const result = await onboardingService.uploadDocument(supplierId, documentType, file);
        if (!result.success) {
          const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error uploading supplier onboarding document:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
  );

  // GET /supplier/documents/:documentType/download
  router.get('/documents/:documentType/download', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const documentType = req.params.documentType as SupplierOnboardingDocumentType;
      const document = await onboardingService.getDocumentForSupplier(supplierId, documentType);
      if (!document) {
        return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND' } });
      }

      res.setHeader('Content-Type', document.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`);
      const stream = await onboardingService.createReadStream(document);
      stream.on('error', (err) => {
        logger.error('[Neture API] Supplier document stream error:', err);
        if (!res.headersSent) res.status(500).end();
        else res.end();
      });
      stream.pipe(res);
    } catch (error) {
      logger.error('[Neture API] Error downloading supplier onboarding document:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED' } });
      }
    }
  });

  // ==================== 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1) ====================

  // GET /supplier/regulated-categories — 공급자 본인 품목군 목록
  router.get('/regulated-categories', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const data = await regulatedCategoryService.listForSupplier(supplierId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error listing regulated categories:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /supplier/regulated-categories — 품목군 선택(행 생성) body: { category }
  router.post('/regulated-categories', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await regulatedCategoryService.selectCategory(supplierId, String(req.body?.category || ''));
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error selecting regulated category:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // PATCH /supplier/regulated-categories/:category — 신고/허가 번호 입력
  router.patch('/regulated-categories/:category', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await regulatedCategoryService.updateCategory(supplierId, req.params.category, {
        registrationNumber: req.body?.registrationNumber,
      });
      if (!result.success) {
        const status = result.error === 'CATEGORY_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error updating regulated category:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /supplier/regulated-categories/:category/submit — 검토 요청(번호 우선, 파일 선택)
  // WO-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1
  router.post('/regulated-categories/:category/submit', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await regulatedCategoryService.submitForReview(supplierId, req.params.category);
      if (!result.success) {
        const status = result.error === 'CATEGORY_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error submitting regulated category for review:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // DELETE /supplier/regulated-categories/:category — 선택 해제(검토중/승인/제한은 잠금)
  router.delete('/regulated-categories/:category', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await regulatedCategoryService.removeCategory(supplierId, req.params.category);
      if (!result.success) {
        const status = result.error === 'CATEGORY_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error removing regulated category:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /supplier/regulated-categories/:category/document — 증빙 PDF 업로드
  router.post(
    '/regulated-categories/:category/document',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    uploadSingleMiddleware('file'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED' } });
        }
        const result = await regulatedCategoryService.uploadEvidence(supplierId, req.params.category, file);
        if (!result.success) {
          const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error uploading regulated category evidence:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
  );

  // GET /supplier/regulated-categories/:category/document/download — 증빙 열람
  router.get('/regulated-categories/:category/document/download', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const document = await regulatedCategoryService.getEvidenceDocument(supplierId, req.params.category);
      if (!document) {
        return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND' } });
      }
      res.setHeader('Content-Type', document.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`);
      const stream = await regulatedCategoryService.createReadStream(document);
      stream.on('error', (err) => {
        logger.error('[Neture API] Regulated category document stream error:', err);
        if (!res.headersSent) res.status(500).end();
        else res.end();
      });
      stream.pipe(res);
    } catch (error) {
      logger.error('[Neture API] Error downloading regulated category evidence:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED' } });
      }
    }
  });

  // PATCH /supplier/profile
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // requireActiveSupplier → requireLinkedSupplier. 프로필 저장은 승인 상태와 무관한 자기 정보 보완이며,
  // ACTIVE 게이트를 걸면 승인 전 공급자가 안내받은 정보를 스스로 입력할 수 없는 교착이 생긴다
  // (GET /profile · PATCH /onboarding 과 동일 레벨로 정합화).
  router.patch('/profile', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const {
        contactEmail, contactPhone, contactWebsite, contactKakao,
        contactEmailVisibility, contactPhoneVisibility,
        contactWebsiteVisibility, contactKakaoVisibility,
        // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
        businessNumber, representativeName, businessAddress,
        // WO-O4O-POSTAL-CODE-ADDRESS-V1
        businessZipCode, businessAddressDetail,
        // WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1
        managerName, managerPhone, businessType, businessItem, taxInvoiceEmail,
        // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1: 사업자등록증 P4 fields
        //   (저장 위치: users.businessInfo JSONB — neture_suppliers 컬럼 부재로 인한 결정)
        businessEntityType, businessStartDate,
        // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
        minOrderAmount, minOrderSurcharge, orderConditionNote,
        // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
        baseShippingFee, freeShippingThreshold, averageDispatchDays, returnExchangeNotice,
        shippingStandard, shippingIsland, shippingMountain,
      } = req.body;
      const result = await netureService.updateSupplierProfile(supplierId, {
        contactEmail, contactPhone, contactWebsite, contactKakao,
        contactEmailVisibility, contactPhoneVisibility,
        contactWebsiteVisibility, contactKakaoVisibility,
        businessNumber, representativeName, businessAddress,
        businessZipCode, businessAddressDetail,
        managerName, managerPhone, businessType, businessItem, taxInvoiceEmail,
        businessEntityType, businessStartDate,
        minOrderAmount, minOrderSurcharge, orderConditionNote,
        baseShippingFee, freeShippingThreshold, averageDispatchDays, returnExchangeNotice,
        shippingStandard, shippingIsland, shippingMountain,
      });
      if (!result) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error updating supplier profile:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
