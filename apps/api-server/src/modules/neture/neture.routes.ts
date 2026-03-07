import { Router, Request, Response } from 'express';
import type { RequestHandler, Router as ExpressRouter } from 'express';
import { NetureService } from './neture.service.js';
import { SupplierStatus, PartnershipStatus, RecruitmentStatus, OfferDistributionType, OfferApprovalStatus } from './entities/index.js';
import { NeturePartnerStatus } from '../../routes/neture/entities/neture-partner.entity.js';
import logger from '../../utils/logger.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import { AppDataSource } from '../../database/connection.js';
import { GlycopharmRepository } from '../../routes/glycopharm/repositories/glycopharm.repository.js';
import type { GlycopharmProduct } from '../../routes/glycopharm/entities/glycopharm-product.entity.js';
import { NeturePartnerDashboardItem } from './entities/NeturePartnerDashboardItem.entity.js';
import { NeturePartnerDashboardItemContent } from './entities/NeturePartnerDashboardItemContent.entity.js';
import { NetureSupplierLibrary } from './entities/NetureSupplierLibrary.entity.js';
import { createNetureAssetSnapshotController } from './controllers/neture-asset-snapshot.controller.js';
import { createNetureHubTriggerController } from './controllers/hub-trigger.controller.js';
import { createNeureTier1TestController } from './controllers/neture-tier1-test.controller.js';
import { ActionLogService } from '@o4o/action-log-core';
import { ProductApprovalV2Service } from '../product-policy-v2/product-approval-v2.service.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';
import { uploadSingleMiddleware } from '../../middleware/upload.middleware.js';
import { CsvImportService } from './services/csv-import.service.js';
import { ImageStorageService } from './services/image-storage.service.js';
import sharp from 'sharp';
import { NetureService as LegacyNetureService } from '../../routes/neture/services/neture.service.js';
import { NetureOrderStatus } from '../../routes/neture/entities/neture-order.entity.js';

const router: ExpressRouter = Router();
const netureService = new NetureService();
const legacyNetureService = new LegacyNetureService(AppDataSource);
const netureActionLogService = new ActionLogService(AppDataSource);
const approvalV2Service = new ProductApprovalV2Service(AppDataSource);
const csvImportService = new CsvImportService(AppDataSource);
const imageStorageService = new ImageStorageService();

// Extended Request type with user info
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

/** Request with supplierId set by requireActiveSupplier / requireLinkedSupplier middleware */
type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};

/** Request with partnerId set by requireActivePartner / requireLinkedPartner middleware */
type PartnerRequest = AuthenticatedRequest & {
  partnerId: string;
};

/**
 * GET /api/v1/neture/suppliers
 * Get all suppliers
 *
 * Query Parameters:
 * - category (optional): Filter by category
 * - status (optional): Filter by status (default: ACTIVE)
 */
router.get('/suppliers', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;

    const filters: { category?: string; status?: SupplierStatus } = {};

    if (category && typeof category === 'string') {
      filters.category = category;
    }

    if (status && typeof status === 'string') {
      filters.status = status as SupplierStatus;
    }

    const suppliers = await netureService.getSuppliers(filters);

    res.json({
      suppliers,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch suppliers',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/suppliers/:slug
 * Get supplier detail by slug
 */
router.get('/suppliers/:slug', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const viewerId = req.user?.id || null;

    const supplier = await netureService.getSupplierBySlug(slug, viewerId);

    if (!supplier) {
      return res.status(404).json({
        error: 'Supplier not found',
      });
    }

    res.json(supplier);
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier detail:', error);
    res.status(500).json({
      error: 'Failed to fetch supplier detail',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/partnership/requests
 * Get all partnership requests
 *
 * Query Parameters:
 * - status (optional): Filter by status ('OPEN', 'MATCHED', 'CLOSED')
 */
router.get('/partnership/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const filters: { status?: PartnershipStatus } = {};

    if (status && typeof status === 'string') {
      filters.status = status as PartnershipStatus;
    }

    const requests = await netureService.getPartnershipRequests(filters);

    res.json({
      requests,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching partnership requests:', error);
    res.status(500).json({
      error: 'Failed to fetch partnership requests',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/partnership/requests/:id
 * Get partnership request detail by ID
 */
router.get('/partnership/requests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await netureService.getPartnershipRequestById(id);

    if (!request) {
      return res.status(404).json({
        error: 'Partnership request not found',
      });
    }

    res.json(request);
  } catch (error) {
    logger.error('[Neture API] Error fetching partnership request detail:', error);
    res.status(500).json({
      error: 'Failed to fetch partnership request detail',
      details: (error as Error).message,
    });
  }
});

// ==================== Supplier Request API (WO-NETURE-SUPPLIER-REQUEST-API-V1) ====================

/**
 * Helper: Get supplier ID from authenticated user
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: fallback 제거 — user_id 매핑만 허용
 */
async function getSupplierIdFromUser(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.user?.id) return null;
  return netureService.getSupplierIdByUserId(req.user.id);
}

/**
 * Middleware: Require authenticated user to be an ACTIVE supplier
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 * 쓰기 작업용 — PENDING/REJECTED/INACTIVE 차단
 */
async function requireActiveSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  if (supplier.status !== SupplierStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
      currentStatus: supplier.status,
    });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}

/**
 * Middleware: Require authenticated user to be a linked supplier (any status)
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 * 읽기 작업용 — PENDING/REJECTED도 자신의 프로필/대시보드 조회 허용
 */
async function requireLinkedSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}

// ==================== Partner Domain Gate (WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1) ====================

/**
 * Middleware: Require authenticated user to be an ACTIVE partner
 * 쓰기 작업용 — PENDING/SUSPENDED/INACTIVE 차단
 */
async function requireActivePartner(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const partner = await netureService.getPartnerByUserId(authReq.user.id);
  if (!partner) {
    res.status(401).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
    return;
  }
  if (partner.status !== NeturePartnerStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      error: { code: 'PARTNER_NOT_ACTIVE', message: `Partner account is ${partner.status}. Only ACTIVE partners can perform this action.` },
      currentStatus: partner.status,
    });
    return;
  }
  (req as PartnerRequest).partnerId = partner.id;
  next();
}

/**
 * Middleware: Require authenticated user to be a linked partner (any status)
 * 읽기 작업용 — PENDING/SUSPENDED도 자신의 대시보드 조회 허용
 */
async function requireLinkedPartner(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const partner = await netureService.getPartnerByUserId(authReq.user.id);
  if (!partner) {
    res.status(401).json({ success: false, error: { code: 'NO_PARTNER', message: 'No linked partner account found' } });
    return;
  }
  (req as PartnerRequest).partnerId = partner.id;
  next();
}

// ==================== Supplier Onboarding (WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1) ====================

/**
 * POST /api/v1/neture/supplier/register
 * 공급자 신청 — Supplier 생성 (status = PENDING)
 */
router.post('/supplier/register', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

/**
 * GET /api/v1/neture/admin/suppliers/pending
 * 승인 대기 공급자 목록 (관리자 전용)
 */
router.get('/admin/suppliers/pending', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await netureService.getPendingSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error('[Neture API] Error fetching pending suppliers:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending suppliers' } });
  }
});

/**
 * POST /api/v1/neture/admin/suppliers/:id/approve
 * 공급자 승인 (PENDING → ACTIVE)
 */
router.post('/admin/suppliers/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user?.id;
    if (!approvedBy) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await netureService.approveSupplier(id, approvedBy);
    if (!result.success) {
      const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', approvedBy, 'neture.admin.supplier_approve', {
      meta: { supplierId: id },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error approving supplier:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve supplier' } });
  }
});

/**
 * POST /api/v1/neture/admin/suppliers/:id/reject
 * 공급자 거절 (PENDING → REJECTED)
 */
router.post('/admin/suppliers/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rejectedBy = req.user?.id;
    if (!rejectedBy) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const { reason } = req.body || {};
    const result = await netureService.rejectSupplier(id, rejectedBy, reason);
    if (!result.success) {
      const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', rejectedBy, 'neture.admin.supplier_reject', {
      meta: { supplierId: id, reason },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error rejecting supplier:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject supplier' } });
  }
});

/**
 * POST /api/v1/neture/admin/suppliers/:id/deactivate
 * WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1
 * 공급자 비활성화 (ACTIVE → INACTIVE)
 */
router.post('/admin/suppliers/:id/deactivate', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await netureService.deactivateSupplier(id, adminUserId);
    if (!result.success) {
      const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.supplier_deactivate', {
      meta: { supplierId: id },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error deactivating supplier:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate supplier' } });
  }
});

/**
 * GET /api/v1/neture/admin/suppliers
 * WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1
 * 전체 공급자 목록 (상태 필터)
 */
router.get('/admin/suppliers', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filters: { status?: SupplierStatus } = {};
    if (status && typeof status === 'string' && Object.values(SupplierStatus).includes(status as SupplierStatus)) {
      filters.status = status as SupplierStatus;
    }

    const suppliers = await netureService.getAllSuppliers(filters);
    res.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error('[Neture API] Error fetching all suppliers:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch suppliers' } });
  }
});

// ==================== Admin: Product Management (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1) ====================

/**
 * GET /api/v1/neture/admin/products/pending
 * 승인 대기 상품 목록
 */
router.get('/admin/products/pending', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
  try {
    const products = await netureService.getPendingProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('[Neture API] Error fetching pending products:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending products' } });
  }
});

/**
 * POST /api/v1/neture/admin/products/:id/approve
 * 상품 승인 (isActive = true)
 */
router.post('/admin/products/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await netureService.approveProduct(id, adminUserId);
    if (!result.success) {
      const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.product_approve', {
      meta: { productId: id },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error approving product:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve product' } });
  }
});

/**
 * POST /api/v1/neture/admin/products/:id/reject
 * 상품 반려 (isActive 유지 false)
 */
router.post('/admin/products/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const { reason } = req.body || {};
    const result = await netureService.rejectProduct(id, adminUserId, reason);
    if (!result.success) {
      const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.product_reject', {
      meta: { productId: id, reason },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error rejecting product:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject product' } });
  }
});

/**
 * GET /api/v1/neture/admin/products
 * 전체 상품 목록 (필터: supplierId, distributionType, isActive, approvalStatus)
 */
router.get('/admin/products', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, distributionType, isActive, approvalStatus } = req.query;
    const filters: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus } = {};

    if (supplierId && typeof supplierId === 'string') filters.supplierId = supplierId;
    if (distributionType && typeof distributionType === 'string' && Object.values(OfferDistributionType).includes(distributionType as OfferDistributionType)) {
      filters.distributionType = distributionType as OfferDistributionType;
    }
    if (isActive === 'true') filters.isActive = true;
    if (isActive === 'false') filters.isActive = false;
    if (approvalStatus && typeof approvalStatus === 'string' && Object.values(OfferApprovalStatus).includes(approvalStatus as OfferApprovalStatus)) {
      filters.approvalStatus = approvalStatus as OfferApprovalStatus;
    }

    const products = await netureService.getAllProducts(filters);
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('[Neture API] Error fetching all products:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' } });
  }
});

// ==================== Admin: ProductMaster SSOT (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) ====================

/**
 * GET /api/v1/neture/admin/masters
 * ProductMaster 전체 목록 (Admin 전용)
 */
router.get('/admin/masters', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
  try {
    const masters = await netureService.getAllProductMasters();
    res.json({ success: true, data: masters });
  } catch (error) {
    logger.error('[Neture API] Error fetching product masters:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product masters' } });
  }
});

/**
 * GET /api/v1/neture/admin/masters/barcode/:barcode
 * barcode로 ProductMaster 조회
 */
router.get('/admin/masters/barcode/:barcode', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const master = await netureService.getProductMasterByBarcode(barcode);
    if (!master) {
      return res.status(404).json({ success: false, error: { code: 'MASTER_NOT_FOUND', message: 'ProductMaster not found for barcode' } });
    }
    res.json({ success: true, data: master });
  } catch (error) {
    logger.error('[Neture API] Error fetching product master by barcode:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product master' } });
  }
});

/**
 * POST /api/v1/neture/admin/masters/resolve
 * Master 생성 파이프라인: barcode → GTIN 검증 → 내부 조회 → MFDS → create
 *
 * Body: { barcode, manualData?: { regulatoryName, manufacturerName, regulatoryType?, marketingName?, mfdsPermitNumber? } }
 */
router.post('/admin/masters/resolve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { barcode, manualData } = req.body;
    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'MISSING_BARCODE', message: 'barcode is required' } });
    }

    const result = await netureService.resolveOrCreateMaster(barcode.trim(), manualData);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: result.error, message: result.error } });
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error resolving product master:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve product master' } });
  }
});

/**
 * PATCH /api/v1/neture/admin/masters/:id
 * ProductMaster 수정 (immutable 필드 변경 차단)
 *
 * 허용: marketingName, brandName, categoryId, brandId, specification, originCountry, tags
 * 차단: barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId
 */
router.patch('/admin/masters/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await netureService.updateProductMaster(id, req.body);
    if (!result.success) {
      const status = result.error === 'MASTER_NOT_FOUND' ? 404
        : result.error?.startsWith('IMMUTABLE_FIELD_VIOLATION') ? 403
        : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error updating product master:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update product master' } });
  }
});

// ==================== Admin: ProductCategory CRUD (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

/**
 * GET /api/v1/neture/admin/categories
 * 카테고리 트리 (4단계 계층)
 */
router.get('/admin/categories', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
  try {
    const tree = await netureService.getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    logger.error('[Neture API] Error fetching categories:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' } });
  }
});

/**
 * POST /api/v1/neture/admin/categories
 * 카테고리 생성
 */
router.post('/admin/categories', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, parentId, sortOrder } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and slug are required' } });
    }
    const category = await netureService.createCategory({ name, slug, parentId, sortOrder });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    const status = message === 'PARENT_CATEGORY_NOT_FOUND' || message === 'MAX_CATEGORY_DEPTH_EXCEEDED' ? 400 : 500;
    logger.error('[Neture API] Error creating category:', error);
    res.status(status).json({ success: false, error: { code: message, message } });
  }
});

/**
 * PATCH /api/v1/neture/admin/categories/:id
 * 카테고리 수정
 */
router.patch('/admin/categories/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const category = await netureService.updateCategory(id, req.body);
    res.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
    logger.error('[Neture API] Error updating category:', error);
    res.status(status).json({ success: false, error: { code: message, message } });
  }
});

/**
 * DELETE /api/v1/neture/admin/categories/:id
 * 카테고리 삭제
 */
router.delete('/admin/categories/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await netureService.deleteCategory(id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
    logger.error('[Neture API] Error deleting category:', error);
    res.status(status).json({ success: false, error: { code: message, message } });
  }
});

// ==================== Admin: Brand CRUD (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

/**
 * GET /api/v1/neture/admin/brands
 * 브랜드 목록
 */
router.get('/admin/brands', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
  try {
    const brands = await netureService.getAllBrands();
    res.json({ success: true, data: brands });
  } catch (error) {
    logger.error('[Neture API] Error fetching brands:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch brands' } });
  }
});

/**
 * POST /api/v1/neture/admin/brands
 * 브랜드 생성
 */
router.post('/admin/brands', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, manufacturerName, countryOfOrigin } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and slug are required' } });
    }
    const brand = await netureService.createBrand({ name, slug, manufacturerName, countryOfOrigin });
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    logger.error('[Neture API] Error creating brand:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create brand' } });
  }
});

/**
 * PATCH /api/v1/neture/admin/brands/:id
 * 브랜드 수정
 */
router.patch('/admin/brands/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const brand = await netureService.updateBrand(id, req.body);
    res.json({ success: true, data: brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update brand';
    const status = message === 'BRAND_NOT_FOUND' ? 404 : 500;
    logger.error('[Neture API] Error updating brand:', error);
    res.status(status).json({ success: false, error: { code: message, message } });
  }
});

/**
 * DELETE /api/v1/neture/admin/brands/:id
 * 브랜드 삭제
 */
router.delete('/admin/brands/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await netureService.deleteBrand(id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete brand';
    const status = message === 'BRAND_NOT_FOUND' ? 404 : 500;
    logger.error('[Neture API] Error deleting brand:', error);
    res.status(status).json({ success: false, error: { code: message, message } });
  }
});

// ==================== Public Read-Only Endpoints (WO-O4O-SUPPLIER-PRODUCT-CREATE-PAGE-V1) ====================

/**
 * GET /api/v1/neture/categories
 * 공개 카테고리 트리 (isActive=true) — 공급자 상품 등록 시 카테고리 선택용
 */
router.get('/categories', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tree = await netureService.getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    logger.error('[Neture API] Error fetching public categories:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/neture/brands
 * 공개 브랜드 목록 (isActive=true) — 공급자 상품 등록 시 브랜드 선택용
 */
router.get('/brands', requireAuth, async (_req: Request, res: Response) => {
  try {
    const brands = await netureService.getAllBrands();
    res.json({ success: true, data: brands });
  } catch (error) {
    logger.error('[Neture API] Error fetching public brands:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/neture/masters/barcode/:barcode
 * 공개 바코드 조회 — 공급자가 상품 등록 시 Master 존재 여부 확인용
 */
router.get('/masters/barcode/:barcode', requireAuth, async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const master = await netureService.getProductMasterByBarcode(barcode);
    if (!master) {
      return res.status(404).json({ success: false, error: 'MASTER_NOT_FOUND' });
    }
    res.json({ success: true, data: master });
  } catch (error) {
    logger.error('[Neture API] Error fetching master by barcode (public):', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// ==================== Product Images (WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1) ====================

/**
 * GET /api/v1/neture/products/:masterId/images
 * 상품 이미지 목록 조회
 */
router.get('/products/:masterId/images', requireAuth, async (req: Request, res: Response) => {
  try {
    const images = await netureService.getProductImages(req.params.masterId);
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('[Neture API] Error fetching product images:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/neture/products/:masterId/images
 * 상품 이미지 업로드 (공급자용)
 * - multer memoryStorage → sharp 리사이즈 → GCS 업로드 → DB 저장
 */
router.post('/products/:masterId/images', requireAuth, requireActiveSupplier, uploadSingleMiddleware('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterId } = req.params;
    const file = req.file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ success: false, error: 'NO_FILE' });
    }

    // sharp: 리사이즈 + webp 변환
    const processed = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // GCS 업로드
    const { url, gcsPath } = await imageStorageService.uploadImage(
      masterId,
      processed,
      'image/webp',
      file.originalname
    );

    // DB 레코드 생성
    const image = await netureService.addProductImage(masterId, url, gcsPath);

    res.status(201).json({ success: true, data: image });
  } catch (error) {
    logger.error('[Neture API] Error uploading product image:', error);
    res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
  }
});

/**
 * PATCH /api/v1/neture/products/images/:imageId/primary
 * 대표 이미지 변경
 */
router.patch('/products/images/:imageId/primary', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageId } = req.params;
    const { masterId } = req.body;

    if (!masterId) {
      return res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
    }

    await netureService.setPrimaryImage(imageId, masterId);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Neture API] Error setting primary image:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/v1/neture/products/images/:imageId
 * 이미지 삭제 (DB + GCS)
 */
router.delete('/products/images/:imageId', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageId } = req.params;
    const { masterId } = req.body;

    if (!masterId) {
      return res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
    }

    const { gcsPath } = await netureService.deleteProductImage(imageId, masterId);
    await imageStorageService.deleteImage(gcsPath);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status = message === 'IMAGE_NOT_FOUND' ? 404 : 500;
    logger.error('[Neture API] Error deleting product image:', error);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/v1/neture/admin/products/:masterId/images
 * Admin 이미지 업로드
 */
router.post('/admin/products/:masterId/images', requireAuth, requireNetureScope('neture:admin'), uploadSingleMiddleware('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterId } = req.params;
    const file = req.file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ success: false, error: 'NO_FILE' });
    }

    const processed = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const { url, gcsPath } = await imageStorageService.uploadImage(masterId, processed, 'image/webp', file.originalname);
    const image = await netureService.addProductImage(masterId, url, gcsPath);

    res.status(201).json({ success: true, data: image });
  } catch (error) {
    logger.error('[Neture API] Error uploading admin product image:', error);
    res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
  }
});

// ==================== Supplier Requests (v2) ====================

/**
 * GET /api/v1/neture/supplier/requests
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
 */
router.get('/supplier/requests', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const { status, serviceId } = req.query;
    const params: unknown[] = [supplierId];
    let statusFilter = '';
    let serviceFilter = '';

    if (status && typeof status === 'string') {
      params.push(status);
      statusFilter = ` AND pa.approval_status = $${params.length}`;
    }
    if (serviceId && typeof serviceId === 'string') {
      params.push(serviceId);
      serviceFilter = ` AND pa.service_key = $${params.length}`;
    }

    const rows = await AppDataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              spo.supplier_id AS "supplierId", ns.name AS "supplierName",
              pa.organization_id AS "sellerId",
              pa.service_key AS "serviceId",
              pm.marketing_name AS "productName", pa.offer_id AS "offerId",
              pa.reason AS "rejectReason",
              pa.decided_by AS "decidedBy", pa.decided_at AS "decidedAt",
              pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE pa.approval_type = 'PRIVATE'
         AND spo.supplier_id = $1${statusFilter}${serviceFilter}
       ORDER BY pa.created_at DESC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier requests:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier requests',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/requests/:id
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
 */
router.get('/supplier/requests/:id', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const { id } = req.params;

    const rows = await AppDataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              spo.supplier_id AS "supplierId", ns.name AS "supplierName",
              pa.organization_id AS "sellerId",
              pa.service_key AS "serviceId",
              pm.marketing_name AS "productName", pa.offer_id AS "offerId",
              pm.brand_name AS "productCategory",
              pa.reason AS "rejectReason",
              pa.decided_by AS "decidedBy", pa.decided_at AS "decidedAt",
              pa.requested_by AS "requestedBy",
              pa.metadata, pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE pa.id = $1 AND pa.approval_type = 'PRIVATE'
         AND spo.supplier_id = $2`,
      [id, supplierId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Supplier request not found',
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier request detail:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier request detail',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/approve
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests/:id/approve', requireRole('supplier'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system. Use POST /api/v1/product-policy-v2/private-approval/:id/approve' },
  });
});

/**
 * POST /api/v1/neture/supplier/requests/:id/reject
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests/:id/reject', requireRole('supplier'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system. Use POST /api/v1/product-policy-v2/private-approval/:id/approve or reject' },
  });
});

/**
 * POST /api/v1/neture/supplier/requests
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system. Use POST /api/v1/product-policy-v2/private-approval' },
  });
});

// ==================== Supplier CSV Import (WO-O4O-B2B-CSV-INGEST-PIPELINE-V1) ====================

/**
 * POST /api/v1/neture/supplier/csv-import/upload
 * CSV 업로드 + 검증 (2-Phase: upload+validate)
 */
router.post('/supplier/csv-import/upload', requireAuth, requireActiveSupplier, uploadSingleMiddleware('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV file is required' } });
    }

    const result = await csvImportService.uploadAndValidate(supplierId, userId, {
      buffer: file.buffer,
      originalname: file.originalname,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: result.error, message: result.error } });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error('[Neture API] Error uploading CSV:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process CSV upload' } });
  }
});

/**
 * GET /api/v1/neture/supplier/csv-import/batches
 * 공급자별 CSV import batch 목록
 */
router.get('/supplier/csv-import/batches', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const batches = await csvImportService.listBatches(supplierId);
    res.json({ success: true, data: batches });
  } catch (error) {
    logger.error('[Neture API] Error listing CSV batches:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list CSV batches' } });
  }
});

/**
 * GET /api/v1/neture/supplier/csv-import/batches/:id
 * Batch 상세 조회 (rows 포함)
 */
router.get('/supplier/csv-import/batches/:id', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { id } = req.params;

    const result = await csvImportService.getBatch(id, supplierId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: result.error, message: result.error } });
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error fetching CSV batch:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch CSV batch' } });
  }
});

/**
 * POST /api/v1/neture/supplier/csv-import/batches/:id/apply
 * 2-Phase Apply — 검증 완료 batch를 실제 반영
 */
router.post('/supplier/csv-import/batches/:id/apply', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { id } = req.params;

    const result = await csvImportService.applyBatch(id, supplierId);
    if (!result.success) {
      const status = result.error === 'BATCH_NOT_FOUND' ? 404
        : result.error === 'SUPPLIER_NOT_ACTIVE' ? 403
        : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error applying CSV batch:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to apply CSV batch' } });
  }
});

// ==================== Supplier Products (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2) ====================

/**
 * POST /api/v1/neture/supplier/products
 * Create a new offer for authenticated supplier
 *
 * WO-NETURE-LAYER2-MASTER-PIPELINE-ENFORCEMENT-V1
 * barcode 기반 — masterId 직접 전달 금지
 */
router.post('/supplier/products', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const { barcode, distributionType, manualData, priceGeneral, priceGold, pricePlatinum, consumerReferencePrice } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, error: 'MISSING_BARCODE', message: 'barcode is required' });
    }

    const result = await netureService.createSupplierOffer(supplierId, {
      barcode,
      manualData,
      distributionType,
      priceGeneral,
      priceGold,
      pricePlatinum,
      consumerReferencePrice,
    });

    if (!result.success) {
      const statusCode = result.error === 'SUPPLIER_NOT_ACTIVE' ? 403 : 400;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('[Neture API] Error creating supplier product:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier product',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/products
 * Get products for authenticated supplier
 */
router.get('/supplier/products', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const products = await netureService.getSupplierProducts(supplierId);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier products',
    });
  }
});

/**
 * PATCH /api/v1/neture/supplier/products/:id
 * Update product status (activation, applications toggle)
 */
router.patch('/supplier/products/:id', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const { id } = req.params;
    const { isActive, distributionType, allowedSellerIds,
            priceGeneral, priceGold, pricePlatinum, consumerReferencePrice } = req.body;

    const result = await netureService.updateSupplierOffer(id, supplierId, {
      isActive,
      distributionType,
      allowedSellerIds,
      priceGeneral,
      priceGold,
      pricePlatinum,
      consumerReferencePrice,
    });

    if (!result.success) {
      const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error updating supplier product:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update supplier product',
    });
  }
});

// ==================== Inventory API (WO-O4O-INVENTORY-ENGINE-V1) ====================

/**
 * GET /api/v1/neture/supplier/inventory
 * List inventory for all supplier's products
 */
router.get('/supplier/inventory', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const items = await AppDataSource.query(
      `SELECT spo.id AS offer_id, spo.master_id,
              pm.marketing_name, pm.brand_name, pm.barcode, pm.specification,
              pi.image_url AS primary_image_url,
              spo.price_general,
              spo.is_active,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.supplier_id = $1
       ORDER BY spo.track_inventory DESC, pm.marketing_name ASC`,
      [supplierId],
    );

    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier inventory:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/v1/neture/supplier/inventory/:offerId
 * Get inventory detail for a specific offer
 */
router.get('/supplier/inventory/:offerId', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { offerId } = req.params;

    const items = await AppDataSource.query(
      `SELECT spo.id AS offer_id, spo.master_id,
              pm.marketing_name, pm.brand_name, pm.barcode, pm.specification,
              pi.image_url AS primary_image_url,
              spo.price_general,
              spo.is_active,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.id = $1 AND spo.supplier_id = $2`,
      [offerId, supplierId],
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Inventory item not found' });
    }

    res.json({ success: true, data: items[0] });
  } catch (error) {
    logger.error('[Neture API] Error fetching inventory detail:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch inventory detail' });
  }
});

/**
 * PATCH /api/v1/neture/supplier/inventory/:offerId
 * Update inventory for a specific offer (stock_quantity, low_stock_threshold, track_inventory)
 */
router.patch('/supplier/inventory/:offerId', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { offerId } = req.params;
    const { stock_quantity, low_stock_threshold, track_inventory } = req.body;

    // Verify ownership
    const ownerCheck = await AppDataSource.query(
      `SELECT id FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2`,
      [offerId, supplierId],
    );
    if (ownerCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Product not found' });
    }

    // Build update fields
    const setClauses: string[] = [];
    const params: any[] = [offerId, supplierId];
    let paramIdx = 3;

    if (stock_quantity !== undefined) {
      if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
        return res.status(400).json({ success: false, error: 'INVALID_STOCK', message: 'stock_quantity must be a non-negative integer' });
      }
      setClauses.push(`stock_quantity = $${paramIdx++}`);
      params.push(stock_quantity);
    }
    if (low_stock_threshold !== undefined) {
      if (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0) {
        return res.status(400).json({ success: false, error: 'INVALID_THRESHOLD', message: 'low_stock_threshold must be a non-negative integer' });
      }
      setClauses.push(`low_stock_threshold = $${paramIdx++}`);
      params.push(low_stock_threshold);
    }
    if (track_inventory !== undefined) {
      setClauses.push(`track_inventory = $${paramIdx++}`);
      params.push(!!track_inventory);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'NO_UPDATES', message: 'No fields to update' });
    }

    setClauses.push('updated_at = NOW()');

    await AppDataSource.query(
      `UPDATE supplier_product_offers SET ${setClauses.join(', ')} WHERE id = $1 AND supplier_id = $2`,
      params,
    );

    // Return updated inventory
    const updated = await AppDataSource.query(
      `SELECT spo.id AS offer_id, spo.master_id,
              pm.marketing_name, pm.brand_name,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE spo.id = $1 AND spo.supplier_id = $2`,
      [offerId, supplierId],
    );

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    logger.error('[Neture API] Error updating inventory:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update inventory' });
  }
});

// ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4) ====================

/**
 * GET /api/v1/neture/supplier/orders/summary
 * Get service-wise order summary for supplier
 *
 * NOTE: Neture does NOT process orders.
 * This endpoint provides summary and links to navigate to each service.
 */
router.get('/supplier/orders/summary', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const summary = await netureService.getSupplierOrdersSummary(supplierId);

    res.json({
      success: true,
      data: summary,
      notice: 'Neture는 주문을 직접 처리하지 않습니다. 각 서비스에서 주문을 관리하세요.',
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching order summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch order summary',
    });
  }
});

// ==================== Supplier Order Processing API ====================
// WO-O4O-SUPPLIER-ORDER-PROCESSING-V1

/** Extract region (시/도) from shipping address */
function extractRegion(shipping: any): string | null {
  try {
    const s = typeof shipping === 'string' ? JSON.parse(shipping) : shipping;
    if (s?.address) {
      const first = s.address.trim().split(/\s+/)[0];
      return first || null;
    }
    return null;
  } catch { return null; }
}

/** Allowed supplier status transitions */
const SUPPLIER_STATUS_TRANSITIONS: Record<string, string[]> = {
  [NetureOrderStatus.CREATED]: [NetureOrderStatus.PREPARING],
  [NetureOrderStatus.PAID]: [NetureOrderStatus.PREPARING],
  [NetureOrderStatus.PREPARING]: [NetureOrderStatus.SHIPPED],
  [NetureOrderStatus.SHIPPED]: [NetureOrderStatus.DELIVERED],
};

/**
 * GET /api/v1/neture/supplier/orders/kpi
 * WO-O4O-SUPPLIER-DASHBOARD-V1: Order KPI for supplier dashboard
 */
router.get('/supplier/orders/kpi', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const result = await AppDataSource.query(
      `SELECT
         COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= CURRENT_DATE)::int AS today_orders,
         COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('created', 'paid'))::int AS pending_processing,
         COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'preparing')::int AS pending_shipping,
         COUNT(DISTINCT o.id)::int AS total_orders
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE spo.supplier_id = $1`,
      [supplierId],
    );

    res.json({
      success: true,
      data: {
        today_orders: Number(result[0]?.today_orders || 0),
        pending_processing: Number(result[0]?.pending_processing || 0),
        pending_shipping: Number(result[0]?.pending_shipping || 0),
        total_orders: Number(result[0]?.total_orders || 0),
      },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier order KPI:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order KPI' });
  }
});

/**
 * GET /api/v1/neture/supplier/orders
 * List orders containing this supplier's products (paginated)
 */
router.get('/supplier/orders', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const baseParams: any[] = [supplierId];
    let statusClause = '';
    if (status) {
      statusClause = 'AND o.status = $2';
      baseParams.push(status);
    }

    const [orders, countResult] = await Promise.all([
      AppDataSource.query(
        `SELECT DISTINCT ON (o.created_at, o.id)
                o.id, o.order_number, o.status, o.total_amount, o.shipping_fee,
                o.final_amount, o.orderer_name, o.orderer_phone, o.orderer_email,
                o.shipping, o.note, o.created_at, o.updated_at,
                (SELECT COUNT(*)::int FROM neture_order_items oi2
                 JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1) AS item_count
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1 ${statusClause}
         ORDER BY o.created_at DESC, o.id
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      AppDataSource.query(
        `SELECT COUNT(DISTINCT o.id)::int AS total
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1 ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);

    const data = orders.map((o: any) => {
      const shippingParsed = typeof o.shipping === 'string' ? JSON.parse(o.shipping) : o.shipping;
      return {
        ...o,
        item_count: Number(o.item_count || 0),
        shipping: shippingParsed,
        region: extractRegion(o.shipping),
      };
    });

    res.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier orders:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier orders' });
  }
});

/**
 * GET /api/v1/neture/supplier/orders/:id
 * Get order detail for supplier (with ownership validation & enrichment)
 */
router.get('/supplier/orders/:id', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const orderId = req.params.id;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
    }

    // Ownership check: order must contain this supplier's products
    const ownerCheck = await AppDataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );

    if (Number(ownerCheck[0]?.cnt) === 0) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Fetch order without userId restriction (ownership already verified via supplier)
    const order = await legacyNetureService.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Enrich items with supplier/product master info (same pattern as seller/orders/:id)
    if (order.items && order.items.length > 0) {
      const productIds = order.items.map((i: any) => i.product_id);

      const enrichments = await AppDataSource.query(
        `SELECT spo.id AS offer_id,
                s.id AS supplier_id, s.name AS supplier_name,
                s.contact_phone AS supplier_phone, s.contact_website AS supplier_website,
                pm.brand_name, pm.specification, pm.barcode,
                pi.image_url AS primary_image_url
         FROM supplier_product_offers spo
         JOIN neture_suppliers s ON s.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
         WHERE spo.id = ANY($1::uuid[])`,
        [productIds],
      );

      const enrichMap = new Map<string, any>(enrichments.map((e: any) => [e.offer_id, e]));

      order.items = order.items.map((item: any) => {
        const e = enrichMap.get(item.product_id);
        return {
          ...item,
          supplier_id: e?.supplier_id || null,
          supplier_name: e?.supplier_name || null,
          supplier_phone: e?.supplier_phone || null,
          supplier_website: e?.supplier_website || null,
          brand_name: e?.brand_name || null,
          specification: e?.specification || null,
          barcode: e?.barcode || null,
          primary_image_url: e?.primary_image_url || item.product_image || null,
        };
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier order detail:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order detail' });
  }
});

/**
 * PATCH /api/v1/neture/supplier/orders/:id/status
 * Update order status (supplier processing workflow)
 */
router.patch('/supplier/orders/:id/status', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'MISSING_STATUS', message: 'Status is required' });
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
    }

    // Ownership check
    const ownerCheck = await AppDataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );

    if (Number(ownerCheck[0]?.cnt) === 0) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Fetch current order status
    const currentOrder = await legacyNetureService.getOrder(orderId);
    if (!currentOrder) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Validate status transition
    const allowed = SUPPLIER_STATUS_TRANSITIONS[currentOrder.status] || [];
    if (!allowed.includes(status)) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from '${currentOrder.status}' to '${status}'`,
      });
    }

    // Update via legacy service
    const updated = await legacyNetureService.updateOrderStatus(orderId, { status });
    if (!updated) {
      return res.status(500).json({ success: false, error: 'UPDATE_FAILED', message: 'Failed to update order status' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[Neture API] Error updating supplier order status:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update order status' });
  }
});

// ==================== Shipment API (WO-O4O-SHIPMENT-ENGINE-V1) ====================

const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  shipped: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
};

/**
 * POST /api/v1/neture/supplier/orders/:orderId/shipment
 * 송장 등록 → 주문 상태 자동 shipped 전환
 */
router.post('/supplier/orders/:orderId/shipment', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { orderId } = req.params;
    const { carrier_code, carrier_name, tracking_number } = req.body;

    if (!carrier_code || !carrier_name || !tracking_number) {
      return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'carrier_code, carrier_name, tracking_number are required' });
    }

    // UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
    }

    // Ownership check
    const ownerCheck = await AppDataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );
    if (Number(ownerCheck[0]?.cnt) === 0) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Order must be in 'preparing' state
    const currentOrder = await legacyNetureService.getOrder(orderId);
    if (!currentOrder) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    if (currentOrder.status !== NetureOrderStatus.PREPARING) {
      return res.status(403).json({ success: false, error: 'INVALID_STATE', message: `Order must be in 'preparing' state (current: ${currentOrder.status})` });
    }

    // Check if shipment already exists
    const existing = await AppDataSource.query(
      `SELECT id FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'SHIPMENT_EXISTS', message: 'Shipment already registered for this order' });
    }

    // Create shipment
    const [shipment] = await AppDataSource.query(
      `INSERT INTO neture_shipments (order_id, supplier_id, carrier_code, carrier_name, tracking_number, status, shipped_at)
       VALUES ($1, $2, $3, $4, $5, 'shipped', NOW())
       RETURNING *`,
      [orderId, supplierId, carrier_code, carrier_name, tracking_number],
    );

    // Auto-transition order status to 'shipped'
    await legacyNetureService.updateOrderStatus(orderId, { status: NetureOrderStatus.SHIPPED });

    res.json({ success: true, data: shipment });
  } catch (error) {
    logger.error('[Neture API] Error creating shipment:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create shipment' });
  }
});

/**
 * GET /api/v1/neture/supplier/orders/:orderId/shipment
 * 공급자 배송 조회
 */
router.get('/supplier/orders/:orderId/shipment', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { orderId } = req.params;

    // Ownership check
    const ownerCheck = await AppDataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );
    if (Number(ownerCheck[0]?.cnt) === 0) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const rows = await AppDataSource.query(
      `SELECT * FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    logger.error('[Neture API] Error fetching shipment:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch shipment' });
  }
});

/**
 * PATCH /api/v1/neture/supplier/shipments/:id
 * 배송 상태 변경 (shipped → in_transit → delivered)
 */
router.patch('/supplier/shipments/:id', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const shipmentId = req.params.id;
    const { status, tracking_number } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'MISSING_STATUS', message: 'status is required' });
    }

    // Fetch shipment with ownership check
    const rows = await AppDataSource.query(
      `SELECT * FROM neture_shipments WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [shipmentId, supplierId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' });
    }

    const shipment = rows[0];

    // Validate status transition
    const allowed = SHIPMENT_STATUS_TRANSITIONS[shipment.status] || [];
    if (!allowed.includes(status)) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from '${shipment.status}' to '${status}'`,
      });
    }

    // Build update query
    const setClauses = [`status = $1`, `updated_at = NOW()`];
    const params: any[] = [status];
    let paramIdx = 2;

    if (status === 'delivered') {
      setClauses.push(`delivered_at = NOW()`);
    }

    if (tracking_number) {
      setClauses.push(`tracking_number = $${paramIdx}`);
      params.push(tracking_number);
      paramIdx++;
    }

    params.push(shipmentId);
    const [updated] = await AppDataSource.query(
      `UPDATE neture_shipments SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params,
    );

    // Auto-transition order status to 'delivered' if shipment delivered
    if (status === 'delivered') {
      await legacyNetureService.updateOrderStatus(shipment.order_id, { status: NetureOrderStatus.DELIVERED });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[Neture API] Error updating shipment:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update shipment' });
  }
});

// ==================== Dashboard Summary API ====================

/**
 * GET /api/v1/neture/supplier/dashboard/summary
 * Get dashboard summary for authenticated supplier
 */
router.get('/supplier/dashboard/summary', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const summary = await netureService.getSupplierDashboardSummary(supplierId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch dashboard summary',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/dashboard/ai-insight
 * AI-powered seller growth insight — aggregated supplier data → AI analysis.
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 Phase 4
 *
 * Principles:
 * - Only authenticated supplier's own data (ownership enforced)
 * - Aggregated stats only (no cross-supplier data)
 * - AI failure → graceful fallback
 */
router.get('/supplier/dashboard/ai-insight', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    // Collect aggregated context from existing service
    const dashboardSummary = await netureService.getSupplierDashboardSummary(supplierId);
    const stats = dashboardSummary.stats;

    // Product distribution analysis
    const topProductShare = stats.totalProducts > 0
      ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
      : 0;

    // Call AI Orchestrator
    const { runAIInsight } = await import('@o4o/ai-core');

    const aiResult = await runAIInsight({
      service: 'neture',
      insightType: 'seller-growth',
      contextData: {
        requests: {
          total: stats.totalRequests,
          pending: stats.pendingRequests,
          approved: stats.approvedRequests,
          rejected: stats.rejectedRequests,
          recentApprovals: stats.recentApprovals,
          approvalRate: stats.totalRequests > 0
            ? Math.round((stats.approvedRequests / stats.totalRequests) * 100)
            : 0,
        },
        products: {
          total: stats.totalProducts,
          active: stats.activeProducts,
          activeRatio: topProductShare,
          skuCount: stats.totalProducts,
        },
        content: {
          total: stats.totalContents,
          published: stats.publishedContents,
          publishRate: stats.totalContents > 0
            ? Math.round((stats.publishedContents / stats.totalContents) * 100)
            : 0,
        },
        connectedServices: stats.connectedServices,
        recentActivityCount: dashboardSummary.recentActivity?.length ?? 0,
      },
      user: {
        id: req.user?.id || '',
        role: 'neture:supplier',
      },
    });

    if (aiResult.success && aiResult.insight) {
      res.json({
        success: true,
        data: {
          insight: aiResult.insight,
          meta: {
            provider: aiResult.meta.provider,
            model: aiResult.meta.model,
            durationMs: aiResult.meta.durationMs,
            confidenceScore: aiResult.insight.confidenceScore,
          },
        },
      });
    } else {
      // Graceful fallback — rule-based
      const actions: string[] = [];
      if (stats.pendingRequests > 0) actions.push(`대기 중인 요청 ${stats.pendingRequests}건 확인 필요`);
      if (stats.activeProducts === 0) actions.push('활성 상품이 없습니다 — 상품 등록을 시작하세요');
      if (stats.publishedContents === 0) actions.push('발행된 콘텐츠가 없습니다 — 콘텐츠 작성을 권장합니다');
      if (stats.recentApprovals > 0) actions.push(`최근 7일 ${stats.recentApprovals}건 승인 — 상품 업데이트 확인`);

      const riskLevel = stats.rejectedRequests > stats.approvedRequests ? 'high'
        : stats.pendingRequests > 3 ? 'medium' : 'low';

      res.json({
        success: true,
        data: {
          insight: {
            summary: `총 요청 ${stats.totalRequests}건 (승인 ${stats.approvedRequests}건), 상품 ${stats.totalProducts}개, 콘텐츠 ${stats.totalContents}건.`,
            riskLevel,
            recommendedActions: actions,
            confidenceScore: 1.0,
          },
          meta: { provider: 'fallback', model: 'rule-based', durationMs: 0, confidenceScore: 1.0 },
        },
      });
    }
  } catch (error) {
    logger.error('[Neture API] Error generating AI insight:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate AI insight',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/profile
 * Get supplier profile for authenticated supplier (contact info etc.)
 */
router.get('/supplier/profile', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
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

/**
 * GET /api/v1/neture/supplier/profile/completeness
 * Get profile completeness indicator (internal, supplier-only)
 * WO-O4O-SUPPLIER-PROFILE-COMPLETENESS-V1
 */
router.get('/supplier/profile/completeness', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
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

/**
 * PATCH /api/v1/neture/supplier/profile
 * Update supplier contact info
 */
router.patch('/supplier/profile', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const {
      contactEmail, contactPhone, contactWebsite, contactKakao,
      contactEmailVisibility, contactPhoneVisibility,
      contactWebsiteVisibility, contactKakaoVisibility,
    } = req.body;

    const result = await netureService.updateSupplierProfile(supplierId, {
      contactEmail,
      contactPhone,
      contactWebsite,
      contactKakao,
      contactEmailVisibility,
      contactPhoneVisibility,
      contactWebsiteVisibility,
      contactKakaoVisibility,
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

/**
 * GET /api/v1/neture/operator/supply-products
 * 운영자용 공급 가능 제품 목록 + 공급요청 상태
 * WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1
 */
router.get('/operator/supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const data = await netureService.getOperatorSupplyProducts(userId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching operator supply products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch operator supply products',
    });
  }
});

/**
 * GET /api/v1/neture/admin/dashboard/summary
 * Get admin/operator dashboard summary (requires admin role)
 *
 * WO-P1-SERVICE-ROLE-PREFIX-ROLLING-IMPLEMENTATION-V1 (Phase 3: Neture)
 * Security Fix: Changed from requireAuth to requireAdmin
 * - Enforces platform:admin or platform:super_admin (via Phase 2 middleware update)
 */
router.get('/admin/dashboard/summary', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await netureService.getAdminDashboardSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch admin dashboard summary',
    });
  }
});

/**
 * GET /api/v1/neture/partner/recruiting-products
 * Get products marked for partner recruiting (public, no auth)
 * WO-PARTNER-RECRUIT-PHASE1-V1
 */
router.get('/partner/recruiting-products', async (_req: Request, res: Response) => {
  try {
    const glycopharmRepo = new GlycopharmRepository(AppDataSource);
    const products = await glycopharmRepo.findPartnerRecruitingProducts();

    const data = products.map((p) => ({
      id: p.id,
      pharmacy_id: p.pharmacy_id,
      pharmacy_name: p.pharmacy?.name,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: Number(p.price),
      sale_price: p.sale_price ? Number(p.sale_price) : undefined,
      stock_quantity: p.stock_quantity,
      status: p.status,
      is_featured: p.is_featured,
      is_partner_recruiting: p.is_partner_recruiting,
      created_at: p.created_at.toISOString(),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching recruiting products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch recruiting products',
    });
  }
});

// ==================== Partner Recruitment API (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

/**
 * GET /api/v1/neture/partner/recruitments
 * 파트너 모집 목록 조회 (public)
 */
router.get('/partner/recruitments', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filters: { status?: RecruitmentStatus } = {};
    if (status && typeof status === 'string') {
      filters.status = status as RecruitmentStatus;
    }

    const data = await netureService.getPartnerRecruitments(filters);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner recruitments:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner recruitments' });
  }
});

/**
 * POST /api/v1/neture/partner/applications
 * 파트너 신청 (requires auth)
 */
router.post('/partner/applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { recruitmentId } = req.body;
    if (!recruitmentId) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'recruitmentId is required' });
    }

    const partnerName = req.user?.name || '';
    const result = await netureService.createPartnerApplication(recruitmentId, userId, partnerName);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'RECRUITMENT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집 공고를 찾을 수 없습니다.' });
    }
    if (msg === 'RECRUITMENT_CLOSED') {
      return res.status(400).json({ success: false, error: 'RECRUITMENT_CLOSED', message: '마감된 모집입니다.' });
    }
    if (msg === 'DUPLICATE_APPLICATION') {
      return res.status(409).json({ success: false, error: 'DUPLICATE_APPLICATION', message: '이미 신청한 모집입니다.' });
    }
    logger.error('[Neture API] Error creating partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create application' });
  }
});

/**
 * POST /api/v1/neture/partner/applications/:id/approve
 * 파트너 신청 승인 (모집 주체 판매자)
 */
router.post('/partner/applications/:id/approve', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await netureService.approvePartnerApplication(id, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
    }
    if (msg === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
    }
    if (msg === 'NOT_RECRUITMENT_OWNER') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 승인할 수 있습니다.' });
    }
    if (msg === 'ACTIVE_CONTRACT_EXISTS') {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: '이미 활성 계약이 존재합니다.' });
    }
    logger.error('[Neture API] Error approving partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve application' });
  }
});

/**
 * POST /api/v1/neture/partner/applications/:id/reject
 * 파트너 신청 거절 (모집 주체 판매자)
 */
router.post('/partner/applications/:id/reject', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const result = await netureService.rejectPartnerApplication(id, userId, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
    }
    if (msg === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
    }
    if (msg === 'NOT_RECRUITMENT_OWNER') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 거절할 수 있습니다.' });
    }
    logger.error('[Neture API] Error rejecting partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reject application' });
  }
});

/**
 * POST /api/v1/neture/partner/dashboard/items
 * Add a product to partner's dashboard
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 */
router.post('/partner/dashboard/items', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { productId, serviceId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'productId is required' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);

    // Check duplicate
    const existing = await repo.findOne({
      where: { partnerUserId: userId, productId },
    });

    if (existing) {
      return res.json({ success: true, already_exists: true, data: existing });
    }

    const item = repo.create({
      partnerUserId: userId,
      productId,
      serviceId: serviceId || 'glycopharm',
      status: 'active',
    });

    const saved = await repo.save(item);

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error('[Neture API] Error adding partner dashboard item:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to add dashboard item' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/items
 * Get partner's dashboard items with product details
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 */
router.get('/partner/dashboard/items', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const items = await repo.find({
      where: { partnerUserId: userId },
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Batch-fetch product details
    const productIds = items.map((item) => item.productId);
    const glycopharmRepo = new GlycopharmRepository(AppDataSource);
    const productMap = new Map<string, GlycopharmProduct>();

    for (const id of productIds) {
      const product = await glycopharmRepo.findProductById(id);
      if (product) {
        productMap.set(id, product);
      }
    }

    // Batch-fetch content link counts (WO-PARTNER-CONTENT-LINK-PHASE1-V1)
    const itemIds = items.map((item) => item.id);
    const contentCountMap = new Map<string, number>();
    if (itemIds.length > 0) {
      const countRows: Array<{ dashboard_item_id: string; cnt: string }> = await AppDataSource.query(
        `SELECT dashboard_item_id, COUNT(*)::text as cnt FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) GROUP BY dashboard_item_id`,
        [itemIds],
      );
      for (const row of countRows) {
        contentCountMap.set(row.dashboard_item_id, parseInt(row.cnt, 10));
      }
    }

    // Batch-fetch primary content info (WO-PARTNER-CONTENT-PRESENTATION-PHASE3-V1)
    const primaryContentMap = new Map<string, { contentId: string; contentSource: string; title: string; type: string }>();
    if (itemIds.length > 0) {
      const primaryLinks: Array<{ dashboard_item_id: string; content_id: string; content_source: string }> = await AppDataSource.query(
        `SELECT dashboard_item_id, content_id, content_source FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) AND is_primary = true`,
        [itemIds],
      );

      // Fetch titles for primary contents
      const cmsPrimaryIds = primaryLinks.filter((l) => l.content_source === 'cms').map((l) => l.content_id);
      const titleMap = new Map<string, { title: string; type: string }>();

      if (cmsPrimaryIds.length > 0) {
        const cmsRows: Array<{ id: string; title: string; type: string }> = await AppDataSource.query(
          `SELECT id, title, type FROM cms_contents WHERE id = ANY($1)`,
          [cmsPrimaryIds],
        );
        for (const row of cmsRows) {
          titleMap.set(`cms:${row.id}`, { title: row.title, type: row.type });
        }
      }

      for (const link of primaryLinks) {
        const detail = titleMap.get(`${link.content_source}:${link.content_id}`);
        if (detail) {
          primaryContentMap.set(link.dashboard_item_id, {
            contentId: link.content_id,
            contentSource: link.content_source,
            title: detail.title,
            type: detail.type,
          });
        }
      }
    }

    const data = items.map((item) => {
      const product = productMap.get(item.productId);
      const primaryContent = primaryContentMap.get(item.id) || null;
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name || '(삭제된 제품)',
        category: product?.category || 'other',
        price: product ? Number(product.price) : 0,
        pharmacyName: product?.pharmacy?.name,
        serviceId: item.serviceId,
        status: item.status,
        contentCount: contentCountMap.get(item.id) || 0,
        primaryContent,
        createdAt: item.createdAt.toISOString(),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner dashboard items:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard items' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:id
 * Toggle status of a partner dashboard item
 * WO-PARTNER-DASHBOARD-UX-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:id', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'status must be "active" or "inactive"' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await repo.findOne({ where: { id, partnerUserId: userId } });

    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    item.status = status;
    const updated = await repo.save(item);

    res.json({ success: true, data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() } });
  } catch (error) {
    logger.error('[Neture API] Error updating partner dashboard item:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update dashboard item' });
  }
});

/**
 * GET /api/v1/neture/partner/contents
 * Browse available content (CMS + supplier) for partners
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.get('/partner/contents', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
  try {
    const source = (req.query.source as string) || 'all';

    const results: Array<{ id: string; title: string; summary: string | null; type: string; source: string; imageUrl: string | null; createdAt: string }> = [];

    // CMS contents
    if (source === 'all' || source === 'cms') {
      const cmsRows = await AppDataSource.query(
        `SELECT id, title, summary, type, image_url, created_at
         FROM cms_contents
         WHERE status = 'published'
           AND (service_key IN ('neture', 'glycopharm') OR service_key IS NULL)
         ORDER BY created_at DESC
         LIMIT 100`,
      );
      for (const row of cmsRows) {
        results.push({
          id: row.id,
          title: row.title,
          summary: row.summary,
          type: row.type,
          source: 'cms',
          imageUrl: row.image_url,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[Neture API] Error browsing partner contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to browse contents' });
  }
});

/**
 * POST /api/v1/neture/partner/dashboard/items/:itemId/contents
 * Link content to a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.post('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;
    const { contentId, contentSource } = req.body;

    if (!contentId || !contentSource || !['cms'].includes(contentSource)) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'contentId and contentSource (cms) are required' });
    }

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);

    // Duplicate check
    const existing = await linkRepo.findOne({
      where: { dashboardItemId: itemId, contentId, contentSource },
    });
    if (existing) {
      return res.json({ success: true, already_linked: true, data: existing });
    }

    const link = linkRepo.create({ dashboardItemId: itemId, contentId, contentSource });
    const saved = await linkRepo.save(link);

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error('[Neture API] Error linking content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to link content' });
  }
});

/**
 * DELETE /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId
 * Unlink content from a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.delete('/partner/dashboard/items/:itemId/contents/:linkId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId, linkId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
    if (!link) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
    }

    await linkRepo.remove(link);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Neture API] Error unlinking content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to unlink content' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/items/:itemId/contents
 * Get linked contents for a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.get('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const links = await linkRepo.find({
      where: { dashboardItemId: itemId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    if (links.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Batch-fetch content details
    const cmsIds = links.filter((l) => l.contentSource === 'cms').map((l) => l.contentId);

    const contentMap = new Map<string, { title: string; summary: string | null; type: string; imageUrl: string | null; createdAt: string }>();

    if (cmsIds.length > 0) {
      const cmsRows = await AppDataSource.query(
        `SELECT id, title, summary, type, image_url, created_at FROM cms_contents WHERE id = ANY($1)`,
        [cmsIds],
      );
      for (const row of cmsRows) {
        contentMap.set(`cms:${row.id}`, {
          title: row.title,
          summary: row.summary,
          type: row.type,
          imageUrl: row.image_url,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        });
      }
    }

    const data = links.map((link) => {
      const detail = contentMap.get(`${link.contentSource}:${link.contentId}`);
      return {
        linkId: link.id,
        contentId: link.contentId,
        contentSource: link.contentSource,
        title: detail?.title || '(삭제된 콘텐츠)',
        type: detail?.type || 'unknown',
        summary: detail?.summary || null,
        imageUrl: detail?.imageUrl || null,
        sortOrder: link.sortOrder,
        isPrimary: link.isPrimary,
        createdAt: detail?.createdAt || link.createdAt.toISOString(),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching linked contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch linked contents' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/reorder
 * Reorder linked contents
 * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:itemId/contents/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'orderedIds array is required' });
    }

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const links = await linkRepo.find({ where: { dashboardItemId: itemId } });
    const linkMap = new Map(links.map((l) => [l.id, l]));

    // Validate all IDs belong to this item
    for (const id of orderedIds) {
      if (!linkMap.has(id)) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: `Link ID ${id} not found for this item` });
      }
    }

    // Update sort_order
    for (let i = 0; i < orderedIds.length; i++) {
      const link = linkMap.get(orderedIds[i])!;
      link.sortOrder = i;
    }
    await linkRepo.save(links);

    res.json({ success: true });
  } catch (error) {
    logger.error('[Neture API] Error reordering contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reorder contents' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId/primary
 * Set a content link as primary
 * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:itemId/contents/:linkId/primary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId, linkId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);

    // Unset all primary for this item
    await linkRepo.update({ dashboardItemId: itemId }, { isPrimary: false });

    // Set target as primary
    const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
    if (!link) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
    }

    link.isPrimary = true;
    await linkRepo.save(link);

    res.json({ success: true, data: { linkId: link.id, isPrimary: true } });
  } catch (error) {
    logger.error('[Neture API] Error setting primary content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to set primary content' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/summary
 * Get partner dashboard summary
 */
router.get('/partner/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const summary = await netureService.getPartnerDashboardSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch partner dashboard summary',
    });
  }
});

// ==================== Request Events — DEPRECATED (WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1) ====================

/**
 * GET /api/v1/neture/supplier/requests/:id/events → 410 Gone
 * Event table dropped by migration.
 */
router.get('/supplier/requests/:id/events', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Request events have been removed. Event data is no longer available.' },
  });
});

/**
 * GET /api/v1/neture/supplier/events → 410 Gone
 * Event table dropped by migration.
 */
router.get('/supplier/events', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier events have been removed. Event data is no longer available.' },
  });
});

// ==================== Seller Product Query (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1) ====================

/**
 * GET /api/v1/neture/seller/my-products
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
 */
router.get('/seller/my-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const rows = await AppDataSource.query(
      `SELECT pa.id,
              spo.supplier_id AS "supplierId", ns.name AS "supplierName",
              pa.offer_id AS "offerId", pm.marketing_name AS "productName",
              pm.brand_name AS "productCategory",
              pa.service_key AS "serviceId",
              pa.decided_at AS "approvedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE pa.organization_id = $1
         AND pa.approval_type IN ('PRIVATE', 'service')
         AND pa.approval_status = 'approved'
       ORDER BY pa.decided_at DESC`,
      [sellerId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller approved products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch seller approved products',
    });
  }
});

// ==================== Seller Available Supply Products (WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1) ====================

/**
 * GET /api/v1/neture/seller/available-supply-products
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
 */
router.get('/seller/available-supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Step 1: PUBLIC/SERVICE + PRIVATE(본인 배정) 제품 조회 (Tier 1+2+3)
    // WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드 포함
    const products: Array<{
      id: string; name: string; category: string; description: string;
      supplier_id: string; supplier_name: string; distribution_type: string;
      price_general: string; consumer_reference_price: string | null;
      approval_status: string; barcode: string; specification: string | null;
      primary_image_url: string | null;
    }> = await AppDataSource.query(
      `SELECT spo.id, pm.marketing_name AS name, pm.brand_name AS category, '' AS description,
              spo.supplier_id, s.name AS supplier_name,
              spo.distribution_type,
              spo.price_general, spo.consumer_reference_price,
              spo.approval_status,
              pm.barcode, pm.specification,
              pi.image_url AS primary_image_url
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.is_active = true
         AND spo.approval_status = 'APPROVED'
         AND s.status = 'ACTIVE'
         AND (spo.distribution_type IN ('PUBLIC', 'SERVICE')
           OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids)))
       ORDER BY spo.created_at DESC`,
      [sellerId],
    );

    // Step 2: v2 product_approvals에서 seller의 기존 approval 조회 (SERVICE + PRIVATE)
    const approvals: Array<{
      offer_id: string; status: string; approval_id: string; reason: string | null;
    }> = await AppDataSource.query(
      `SELECT pa.offer_id, pa.approval_status AS status, pa.id AS approval_id, pa.reason
       FROM product_approvals pa
       WHERE pa.organization_id = $1 AND pa.approval_type IN ('PRIVATE', 'service')`,
      [sellerId],
    );

    // Step 3: offerId → approval 상태 매핑
    const approvalMap = new Map<string, { status: string; approvalId: string; reason?: string }>();
    for (const a of approvals) {
      const existing = approvalMap.get(a.offer_id);
      if (!existing || a.status === 'pending' || a.status === 'approved') {
        approvalMap.set(a.offer_id, {
          status: a.status,
          approvalId: a.approval_id,
          reason: a.reason || undefined,
        });
      }
    }

    // Step 4: 머지하여 반환
    // WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드 포함
    const data = products.map((product) => {
      const approval = approvalMap.get(product.id);
      return {
        id: product.id,
        name: product.name,
        category: product.category || '',
        description: product.description || '',
        distributionType: product.distribution_type,
        supplierId: product.supplier_id,
        supplierName: product.supplier_name || '',
        supplyStatus: approval?.status || 'available',
        requestId: approval?.approvalId || null,
        rejectReason: approval?.reason || null,
        priceGeneral: Number(product.price_general) || 0,
        consumerReferencePrice: product.consumer_reference_price ? Number(product.consumer_reference_price) : null,
        approvalStatus: product.approval_status || 'PENDING',
        barcode: product.barcode || '',
        specification: product.specification || null,
        primaryImageUrl: product.primary_image_url || null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller available supply products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch seller available supply products',
    });
  }
});

// ==================== Seller SERVICE Application (WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1) ====================

/**
 * POST /api/v1/neture/seller/service-products/:productId/apply
 * 판매자가 SERVICE 상품 취급 신청
 */
router.post('/seller/service-products/:productId/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { productId } = req.params;
    const userRoles: string[] = (req.user as any)?.roles || [];

    // user → organization 매핑
    const organizationId = await resolveStoreAccess(AppDataSource, sellerId, userRoles);
    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'NO_ORGANIZATION',
        message: 'Store owner or KPA operator role required',
      });
    }

    // serviceKey: organization_service_enrollments에서 조회, 없으면 'kpa' 기본값
    const enrollment = await AppDataSource.query(
      `SELECT service_code FROM organization_service_enrollments
       WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
      [organizationId],
    );
    const serviceKey = enrollment[0]?.service_code || 'kpa';

    const result = await approvalV2Service.createServiceApproval(
      productId, organizationId, serviceKey, sellerId,
    );

    if (!result.success) {
      const status = result.error === 'PRODUCT_NOT_FOUND' ? 404
        : result.error === 'APPROVAL_ALREADY_EXISTS' ? 409
        : 400;
      return res.status(status).json({
        success: false,
        error: result.error,
        message: result.error,
      });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error creating SERVICE application:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create SERVICE application',
    });
  }
});

/**
 * GET /api/v1/neture/seller/service-applications
 * 판매자의 SERVICE 승인 신청 목록 조회
 */
router.get('/seller/service-applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userRoles: string[] = (req.user as any)?.roles || [];
    const organizationId = await resolveStoreAccess(AppDataSource, sellerId, userRoles);
    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'NO_ORGANIZATION',
        message: 'Store owner or KPA operator role required',
      });
    }

    const rows = await AppDataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              pa.offer_id AS "offerId",
              pm.marketing_name AS "productName",
              pm.brand_name AS "productCategory",
              ns.name AS "supplierName",
              spo.supplier_id AS "supplierId",
              pa.reason AS "rejectReason",
              pa.requested_by AS "requestedBy",
              pa.decided_by AS "decidedBy",
              pa.decided_at AS "decidedAt",
              pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE pa.organization_id = $1 AND pa.approval_type = 'service'
       ORDER BY pa.created_at DESC`,
      [organizationId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller service applications:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch service applications',
    });
  }
});

// ==================== Admin Request Management (WO-S2S-FLOW-RECOVERY-PHASE2-V1 T2) ====================

/**
 * GET /api/v1/neture/admin/requests
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
 */
router.get('/admin/requests', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, supplierId, serviceId } = req.query;
    const params: unknown[] = [];
    const conditions: string[] = [`pa.approval_type = 'PRIVATE'`];

    if (status && typeof status === 'string') {
      params.push(status);
      conditions.push(`pa.approval_status = $${params.length}`);
    }
    if (supplierId && typeof supplierId === 'string') {
      params.push(supplierId);
      conditions.push(`spo.supplier_id = $${params.length}`);
    }
    if (serviceId && typeof serviceId === 'string') {
      params.push(serviceId);
      conditions.push(`pa.service_key = $${params.length}`);
    }

    const rows = await AppDataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              spo.supplier_id AS "supplierId", ns.name AS "supplierName",
              pa.organization_id AS "sellerId",
              pa.service_key AS "serviceId",
              pm.marketing_name AS "productName", pa.offer_id AS "offerId",
              pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pa.created_at DESC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin requests:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch requests',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/approve
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/admin/requests/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Use POST /api/v1/product-policy-v2/private-approval/:id/approve' },
  });
});

/**
 * POST /api/v1/neture/admin/requests/:id/reject
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/admin/requests/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Use v2 approval API for rejection.' },
  });
});

// ==================== Admin SERVICE Approval Management (WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1) ====================

/**
 * GET /api/v1/neture/admin/service-approvals
 * SERVICE 승인 요청 목록 조회
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 */
router.get('/admin/service-approvals', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    const params: any[] = [];
    let whereClause = `WHERE pa.approval_type = 'service'`;
    if (status && typeof status === 'string') {
      params.push(status);
      whereClause += ` AND pa.approval_status = $${params.length}`;
    }
    const rows = await AppDataSource.query(`
      SELECT pa.id, pa.approval_status AS status,
        pm.marketing_name AS "productName",
        ns.name AS "supplierName",
        o.name AS "sellerOrg",
        pa.service_key AS "serviceId",
        pa.reason AS "rejectReason",
        pa.created_at AS "requestedAt",
        pa.decided_at AS "decidedAt"
      FROM product_approvals pa
      JOIN supplier_product_offers spo ON spo.id = pa.offer_id
      JOIN product_masters pm ON pm.id = spo.master_id
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id
      LEFT JOIN organizations o ON o.id = pa.organization_id
      ${whereClause}
      ORDER BY pa.created_at DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('[Neture] Failed to fetch service approvals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service approvals' });
  }
});

/**
 * POST /api/v1/neture/admin/service-approvals/:id/approve
 * SERVICE 승인 처리 + Listing 자동 생성
 */
router.post('/admin/service-approvals/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await approvalV2Service.approveServiceProduct(id, adminUserId);
    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_approve', {
      meta: { approvalId: id },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error approving SERVICE approval:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve SERVICE approval' } });
  }
});

/**
 * POST /api/v1/neture/admin/service-approvals/:id/reject
 * SERVICE 승인 거절 (Listing 생성 없음)
 */
router.post('/admin/service-approvals/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const { reason } = req.body || {};
    const result = await approvalV2Service.rejectServiceApproval(id, adminUserId, reason);
    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_reject', {
      meta: { approvalId: id, reason },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error rejecting SERVICE approval:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject SERVICE approval' } });
  }
});

/**
 * POST /api/v1/neture/admin/service-approvals/:id/revoke
 * WO-NETURE-TIER2-SERVICE-STATE-POLICY-REALIGN-V1
 * SERVICE 승인 철회 (APPROVED → REVOKED + listing 비활성화)
 */
router.post('/admin/service-approvals/:id/revoke', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const { reason } = req.body || {};
    const result = await approvalV2Service.revokeServiceApproval(id, adminUserId, reason);
    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_APPROVED' ? 404 : 400;
      return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
    }

    netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_revoke', {
      meta: { approvalId: id, reason },
    }).catch(() => {});

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture API] Error revoking SERVICE approval:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke SERVICE approval' } });
  }
});

// ==================== Relation State Extension (WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1) ====================

/**
 * POST /api/v1/neture/supplier/requests/:id/suspend
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests/:id/suspend', requireRole('supplier'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system.' },
  });
});

/**
 * POST /api/v1/neture/supplier/requests/:id/reactivate
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests/:id/reactivate', requireRole('supplier'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system.' },
  });
});

/**
 * POST /api/v1/neture/supplier/requests/:id/revoke
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/supplier/requests/:id/revoke', requireRole('supplier'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system.' },
  });
});

/**
 * POST /api/v1/neture/admin/requests/:id/suspend
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/admin/requests/:id/suspend', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system.' },
  });
});

/**
 * POST /api/v1/neture/admin/requests/:id/revoke
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: 410
 */
router.post('/admin/requests/:id/revoke', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  res.status(410).json({
    success: false,
    error: { code: 'ENDPOINT_DEPRECATED', message: 'Supplier requests are handled by v2 approval system.' },
  });
});

// ==================== Seller Dashboard AI Insight (WO-STORE-AI-V1-SELLER-INSIGHT) ====================

/**
 * GET /api/v1/neture/seller/dashboard/ai-insight
 * Seller 대시보드 AI 인사이트 (4카드 구조)
 */
router.get('/seller/dashboard/ai-insight', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const data = await netureService.getSellerDashboardInsight(sellerId);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture Route] Error fetching seller dashboard insight:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch seller dashboard insight',
    });
  }
});

// ==================== Seller-Partner Contracts (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

/**
 * GET /api/v1/neture/seller/contracts
 * Seller 계약 목록 조회
 * Query: ?status=active|terminated|expired
 */
router.get('/seller/contracts', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = (req as SupplierRequest).supplierId;

    const { status } = req.query;
    const contracts = await netureService.getSellerContracts(sellerId, status as string | undefined);
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller contracts:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
  }
});

/**
 * POST /api/v1/neture/seller/contracts/:id/terminate
 * Seller가 계약 해지
 */
router.post('/seller/contracts/:id/terminate', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = (req as SupplierRequest).supplierId;

    const { id } = req.params;
    const result = await netureService.terminateContract(id, sellerId, 'seller');
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
    }
    if (msg === 'CONTRACT_NOT_ACTIVE') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
    }
    logger.error('[Neture API] Error terminating contract (seller):', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
  }
});

/**
 * POST /api/v1/neture/seller/contracts/:id/commission
 * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
 */
router.post('/seller/contracts/:id/commission', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = (req as SupplierRequest).supplierId;

    const { id } = req.params;
    const { commissionRate } = req.body;
    if (commissionRate === undefined || typeof commissionRate !== 'number') {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'commissionRate (number) is required' });
    }

    const result = await netureService.updateCommissionRate(id, commissionRate, sellerId);
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'ACTIVE_CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '활성 계약을 찾을 수 없습니다.' });
    }
    logger.error('[Neture API] Error updating commission rate:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update commission rate' });
  }
});

/**
 * GET /api/v1/neture/partner/contracts
 * Partner 계약 목록 조회
 * Query: ?status=active|terminated|expired
 */
router.get('/partner/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { status } = req.query;
    const contracts = await netureService.getPartnerContracts(userId, status as string | undefined);
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner contracts:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
  }
});

/**
 * POST /api/v1/neture/partner/contracts/:id/terminate
 * Partner가 계약 해지
 */
router.post('/partner/contracts/:id/terminate', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await netureService.terminateContract(id, userId, 'partner');
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
    }
    if (msg === 'CONTRACT_NOT_ACTIVE') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
    }
    logger.error('[Neture API] Error terminating contract (partner):', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
  }
});

// Hub Trigger routes (WO-NETURE-HUB-ACTION-TRIGGER-EXPANSION-V1)
const hubTriggerController = createNetureHubTriggerController({
  dataSource: AppDataSource,
  requireAuth,
  requireNetureScope,
  getSupplierIdFromUser,
  netureService,
  actionLogService: netureActionLogService,
});
router.use('/hub/trigger', hubTriggerController);

// Asset Snapshot routes (WO-O4O-ASSET-COPY-NETURE-PILOT-V1)
router.use('/assets', createNetureAssetSnapshotController(AppDataSource, requireAuth as RequestHandler));

// ==================== Public Library Item (WO-O4O-NETURE-TO-STORE-MANUAL-FLOW-V1) ====================

/**
 * GET /api/v1/neture/library/public/:id
 * 공개 자료 단건 조회 (인증 불필요, published 상태만)
 * Store에서 fromNeture prefill용으로 사용
 */
router.get('/library/public/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(NetureSupplierLibrary);
    const item = await repo.findOne({ where: { id, status: 'published' as any } });

    if (!item) {
      res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Library item not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        imageUrl: item.imageUrl,
      },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching public library item:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch library item' });
  }
});

// ============================================================================
// Seller Orders (WO-O4O-STORE-ORDERS-PAGE-V1 + WO-O4O-STORE-CART-PAGE-V1)
// ============================================================================

/**
 * GET /api/v1/neture/seller/orders
 * WO-O4O-STORE-ORDERS-PAGE-V1: 판매자 주문 목록 (페이지네이션 + 상태 필터)
 */
router.get('/seller/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { page, limit, status, sort, order: sortOrder } = req.query;
    const result = await legacyNetureService.listOrders({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status: status as any,
      sort: (sort as any) || 'created_at',
      order: (sortOrder as any) || 'desc',
    }, userId);

    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('[Neture API] Error fetching seller orders:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/v1/neture/seller/orders/:id
 * WO-O4O-STORE-ORDERS-PAGE-V1 + WO-O4O-STORE-ORDER-DETAIL-PAGE-V1
 * 판매자 주문 상세 (소유권 검증 + 공급자/상품 정보 enrichment)
 */
router.get('/seller/orders/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const order = await legacyNetureService.getOrder(req.params.id, userId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // WO-O4O-STORE-ORDER-DETAIL-PAGE-V1: 공급자 + 상품 마스터 정보 보강
    if (order.items && order.items.length > 0) {
      const productIds = order.items.map((i: any) => i.product_id);
      const enrichments: Array<{
        offer_id: string; supplier_id: string; supplier_name: string;
        supplier_phone: string | null; supplier_website: string | null;
        brand_name: string | null; specification: string | null; barcode: string;
        primary_image_url: string | null;
      }> = await AppDataSource.query(
        `SELECT spo.id AS offer_id,
                s.id AS supplier_id, s.name AS supplier_name,
                s.contact_phone AS supplier_phone, s.contact_website AS supplier_website,
                pm.brand_name, pm.specification, pm.barcode,
                pi.image_url AS primary_image_url
         FROM supplier_product_offers spo
         JOIN neture_suppliers s ON s.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
         WHERE spo.id = ANY($1::uuid[])`,
        [productIds],
      );

      const enrichMap = new Map(enrichments.map((e) => [e.offer_id, e]));

      order.items = order.items.map((item: any) => {
        const e = enrichMap.get(item.product_id);
        return {
          ...item,
          supplier_id: e?.supplier_id || null,
          supplier_name: e?.supplier_name || null,
          supplier_phone: e?.supplier_phone || null,
          supplier_website: e?.supplier_website || null,
          brand_name: e?.brand_name || null,
          specification: e?.specification || null,
          barcode: e?.barcode || null,
          primary_image_url: e?.primary_image_url || item.product_image || null,
        };
      });
    }

    res.json({ success: true, data: order });
  } catch (error: any) {
    logger.error('[Neture API] Error fetching seller order detail:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order' });
  }
});

/**
 * GET /api/v1/neture/seller/orders/:orderId/shipment
 * WO-O4O-SHIPMENT-ENGINE-V1: 매장(Store) 배송 조회
 */
router.get('/seller/orders/:orderId/shipment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { orderId } = req.params;

    // Verify order belongs to this user
    const order = await legacyNetureService.getOrder(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const rows = await AppDataSource.query(
      `SELECT * FROM neture_shipments WHERE order_id = $1 LIMIT 1`,
      [orderId],
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (error: any) {
    logger.error('[Neture API] Error fetching seller shipment:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch shipment' });
  }
});

/**
 * POST /api/v1/neture/seller/orders
 * WO-O4O-STORE-CART-PAGE-V1: 판매자 B2B 주문 생성 — 6-gate 검증 + 서버 가격 강제
 */
router.post('/seller/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { items, shipping, orderer_name, orderer_phone, orderer_email, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Items required' });
    }
    if (!shipping || !orderer_name || !orderer_phone) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Shipping info and orderer info required' });
    }

    const order = await legacyNetureService.createOrder(
      { items, shipping, orderer_name, orderer_phone, orderer_email, note },
      userId,
    );

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    logger.error('[Neture API] Error creating seller order:', error);
    res.status(400).json({ success: false, error: 'ORDER_CREATION_FAILED', message: error.message });
  }
});

// ==================== Settlement Engine (WO-O4O-SETTLEMENT-ENGINE-V1) ====================

/** Default platform fee rate for supplier settlements (10%) */
const NETURE_PLATFORM_FEE_RATE = 0.10;

/**
 * GET /api/v1/neture/supplier/settlements
 * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 목록 (페이지네이션 + 상태 필터)
 */
router.get('/supplier/settlements', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const baseParams: any[] = [supplierId];
    let statusClause = '';
    if (status && ['pending', 'calculated', 'approved', 'paid', 'cancelled'].includes(status)) {
      statusClause = 'AND s.status = $2';
      baseParams.push(status);
    }

    const [settlements, countResult] = await Promise.all([
      AppDataSource.query(
        `SELECT s.id, s.supplier_id, s.period_start, s.period_end,
                s.total_sales, s.platform_fee, s.supplier_amount,
                s.platform_fee_rate, s.order_count, s.status,
                s.paid_at, s.notes, s.created_at, s.updated_at
         FROM neture_settlements s
         WHERE s.supplier_id = $1 ${statusClause}
         ORDER BY s.period_end DESC, s.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM neture_settlements s
         WHERE s.supplier_id = $1 ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);

    res.json({
      success: true,
      data: settlements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier settlements:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlements' });
  }
});

/**
 * GET /api/v1/neture/supplier/settlements/kpi
 * WO-O4O-SETTLEMENT-ENGINE-V1: 정산 KPI (대시보드용)
 * NOTE: /kpi must be registered BEFORE /:id
 */
router.get('/supplier/settlements/kpi', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;

    const result = await AppDataSource.query(
      `SELECT
         COALESCE(SUM(supplier_amount) FILTER (WHERE status IN ('calculated', 'approved')), 0)::int AS pending_amount,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status IN ('calculated', 'approved', 'paid')), 0)::int AS total_amount,
         COUNT(*) FILTER (WHERE status IN ('calculated', 'approved'))::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
       FROM neture_settlements
       WHERE supplier_id = $1 AND status != 'cancelled'`,
      [supplierId],
    );

    res.json({
      success: true,
      data: {
        pending_amount: Number(result[0]?.pending_amount || 0),
        paid_amount: Number(result[0]?.paid_amount || 0),
        total_amount: Number(result[0]?.total_amount || 0),
        pending_count: Number(result[0]?.pending_count || 0),
        paid_count: Number(result[0]?.paid_count || 0),
      },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching settlement KPI:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement KPI' });
  }
});

/**
 * GET /api/v1/neture/supplier/settlements/:id
 * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 상세 (연결된 주문 포함)
 */
router.get('/supplier/settlements/:id', requireAuth, requireLinkedSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const settlementId = req.params.id;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settlementId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid settlement ID format' });
    }

    const rows = await AppDataSource.query(
      `SELECT * FROM neture_settlements WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [settlementId, supplierId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
    }
    const settlement = rows[0];

    const orders = await AppDataSource.query(
      `SELECT so.order_id, so.supplier_sales_amount,
              o.order_number, o.status AS order_status,
              o.orderer_name, o.created_at AS order_date
       FROM neture_settlement_orders so
       JOIN neture_orders o ON o.id = so.order_id
       WHERE so.settlement_id = $1
       ORDER BY o.created_at DESC`,
      [settlementId],
    );

    res.json({ success: true, data: { ...settlement, orders } });
  } catch (error) {
    logger.error('[Neture API] Error fetching settlement detail:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement detail' });
  }
});

/**
 * POST /api/v1/neture/admin/settlements/calculate
 * WO-O4O-SETTLEMENT-ENGINE-V1: 정산 일괄 생성 (관리자)
 *
 * Body: { period_start: 'YYYY-MM-DD', period_end: 'YYYY-MM-DD' }
 */
router.post('/admin/settlements/calculate', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period_start, period_end } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'period_start and period_end are required (YYYY-MM-DD)' });
    }
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    if (startDate >= endDate) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'period_start must be before period_end' });
    }

    // Find delivered orders not in any settlement, grouped by supplier
    const supplierAggregates = await AppDataSource.query(
      `SELECT
         spo.supplier_id,
         ARRAY_AGG(DISTINCT o.id) AS order_ids,
         COUNT(DISTINCT o.id)::int AS order_count,
         SUM(oi.total_price)::int AS total_sales
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE o.status = 'delivered'
         AND o.updated_at >= $1::date
         AND o.updated_at < ($2::date + INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM neture_settlement_orders nso
           WHERE nso.order_id = o.id
         )
       GROUP BY spo.supplier_id
       HAVING SUM(oi.total_price) > 0`,
      [period_start, period_end],
    );

    if (supplierAggregates.length === 0) {
      return res.json({
        success: true,
        data: { created: 0, settlements: [] },
        message: 'No unsettled delivered orders found in the given period.',
      });
    }

    const created: any[] = [];
    const feeRate = NETURE_PLATFORM_FEE_RATE;

    for (const agg of supplierAggregates) {
      const totalSales = Number(agg.total_sales);
      const platformFee = Math.round(totalSales * feeRate);
      const supplierAmount = totalSales - platformFee;
      const orderIds: string[] = agg.order_ids;

      const [settlement] = await AppDataSource.query(
        `INSERT INTO neture_settlements
           (supplier_id, period_start, period_end, total_sales, platform_fee,
            supplier_amount, platform_fee_rate, order_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calculated')
         RETURNING *`,
        [agg.supplier_id, period_start, period_end, totalSales,
         platformFee, supplierAmount, feeRate, agg.order_count],
      );

      // Per-order supplier sales for the junction table
      const orderSales = await AppDataSource.query(
        `SELECT o.id AS order_id, SUM(oi.total_price)::int AS supplier_sales_amount
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE o.id = ANY($1::uuid[]) AND spo.supplier_id = $2
         GROUP BY o.id`,
        [orderIds, agg.supplier_id],
      );

      for (const os of orderSales) {
        await AppDataSource.query(
          `INSERT INTO neture_settlement_orders (settlement_id, order_id, supplier_sales_amount)
           VALUES ($1, $2, $3)`,
          [settlement.id, os.order_id, os.supplier_sales_amount],
        );
      }

      created.push(settlement);
    }

    logger.info(`[Neture Settlement] Created ${created.length} settlements for period ${period_start} ~ ${period_end}`);

    res.json({
      success: true,
      data: { created: created.length, settlements: created },
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'DUPLICATE_SETTLEMENT', message: 'A settlement already exists for one or more suppliers in this period.' });
    }
    logger.error('[Neture API] Error calculating settlements:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to calculate settlements' });
  }
});

/**
 * PATCH /api/v1/neture/admin/settlements/:id/status
 * WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1: 정산 취소 (관리자)
 *
 * Body: { status: 'cancelled', notes?: string }
 * calculated 또는 approved 상태에서 취소 가능
 */
router.patch('/admin/settlements/:id/status', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settlementId = req.params.id;
    const { status, notes } = req.body;

    if (!status || status !== 'cancelled') {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'This endpoint only supports "cancelled" status. Use /approve or /pay for transitions.' });
    }

    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];
    let paramIdx = 2;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await AppDataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status IN ('calculated', 'approved')
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in cancellable status' });
    }

    // Delete junction rows to allow re-settlement
    await AppDataSource.query(
      `DELETE FROM neture_settlement_orders WHERE settlement_id = $1`,
      [settlementId],
    );

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('[Neture API] Error cancelling settlement:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to cancel settlement' });
  }
});

// ==================== Admin Settlement Management (WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1) ====================

/**
 * GET /api/v1/neture/admin/settlements
 * 운영자 정산 목록 (페이지네이션 + 상태 필터 + 공급자명)
 */
router.get('/admin/settlements', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const baseParams: any[] = [];
    let statusClause = '';
    let paramIdx = 1;
    if (status && ['pending', 'calculated', 'approved', 'paid', 'cancelled'].includes(status)) {
      statusClause = `WHERE s.status = $${paramIdx}`;
      baseParams.push(status);
      paramIdx++;
    }

    const [settlements, countResult] = await Promise.all([
      AppDataSource.query(
        `SELECT s.id, s.supplier_id, ns.name AS supplier_name,
                s.period_start, s.period_end,
                s.total_sales, s.platform_fee, s.supplier_amount,
                s.platform_fee_rate, s.order_count, s.status,
                s.approved_at, s.paid_at, s.notes, s.created_at, s.updated_at
         FROM neture_settlements s
         LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
         ${statusClause}
         ORDER BY s.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM neture_settlements s
         ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    res.json({
      success: true,
      data: settlements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin settlements:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlements' });
  }
});

/**
 * GET /api/v1/neture/admin/settlements/kpi
 * 운영자 정산 KPI (calculated/approved/paid 건수 + 금액)
 * NOTE: /kpi must be registered BEFORE /:id
 */
router.get('/admin/settlements/kpi', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'calculated')::int AS calculated_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'calculated'), 0)::int AS calculated_amount,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'approved'), 0)::int AS approved_amount,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount
       FROM neture_settlements
       WHERE status != 'cancelled'`,
    );

    res.json({
      success: true,
      data: {
        calculated_count: Number(result[0]?.calculated_count || 0),
        calculated_amount: Number(result[0]?.calculated_amount || 0),
        approved_count: Number(result[0]?.approved_count || 0),
        approved_amount: Number(result[0]?.approved_amount || 0),
        paid_count: Number(result[0]?.paid_count || 0),
        paid_amount: Number(result[0]?.paid_amount || 0),
      },
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin settlement KPI:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlement KPI' });
  }
});

/**
 * GET /api/v1/neture/admin/settlements/:id
 * 운영자 정산 상세 (공급자명 + 연결 주문)
 */
router.get('/admin/settlements/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settlementId = req.params.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settlementId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid settlement ID format' });
    }

    const rows = await AppDataSource.query(
      `SELECT s.*, ns.name AS supplier_name
       FROM neture_settlements s
       LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
       WHERE s.id = $1 LIMIT 1`,
      [settlementId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
    }

    const orders = await AppDataSource.query(
      `SELECT so.order_id, so.supplier_sales_amount,
              o.order_number, o.status AS order_status,
              o.orderer_name, o.created_at AS order_date
       FROM neture_settlement_orders so
       JOIN neture_orders o ON o.id = so.order_id
       WHERE so.settlement_id = $1
       ORDER BY o.created_at DESC`,
      [settlementId],
    );

    res.json({ success: true, data: { ...rows[0], orders } });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin settlement detail:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlement detail' });
  }
});

/**
 * PATCH /api/v1/neture/admin/settlements/:id/approve
 * 운영자 정산 승인 (calculated → approved)
 */
router.patch('/admin/settlements/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settlementId = req.params.id;
    const { notes } = req.body;

    const setClauses = ["status = 'approved'", 'approved_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await AppDataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'calculated'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in "calculated" status' });
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} approved`);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('[Neture API] Error approving settlement:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve settlement' });
  }
});

/**
 * PATCH /api/v1/neture/admin/settlements/:id/pay
 * 운영자 정산 지급 처리 (approved → paid)
 */
router.patch('/admin/settlements/:id/pay', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settlementId = req.params.id;
    const { notes } = req.body;

    const setClauses = ["status = 'paid'", 'paid_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await AppDataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'approved'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in "approved" status' });
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} paid`);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('[Neture API] Error paying settlement:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to pay settlement' });
  }
});

// Tier1 JSON Test Center (WO-NETURE-TIER1-PUBLIC-JSON-TEST-CENTER-V1)
router.use(createNeureTier1TestController({
  dataSource: AppDataSource,
  requireAuth: requireAuth as RequestHandler,
  requireNetureScope,
  netureService,
}));

export default router;
