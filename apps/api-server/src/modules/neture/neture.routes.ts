import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { NetureService } from './neture.service.js';
import { SupplierStatus, PartnershipStatus, SupplierRequestStatus } from './entities/index.js';
import logger from '../../utils/logger.js';
import { requireAuth, requireAdmin, requireRole } from '../../middleware/auth.middleware.js';
import { AppDataSource } from '../../database/connection.js';
import { GlycopharmRepository } from '../../routes/glycopharm/repositories/glycopharm.repository.js';
import { NeturePartnerDashboardItem } from './entities/NeturePartnerDashboardItem.entity.js';

const router: ExpressRouter = Router();
const netureService = new NetureService();

// Extended Request type with user info
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

/**
 * GET /api/v1/neture/suppliers
 * Get all suppliers
 *
 * Query Parameters:
 * - category (optional): Filter by category
 * - status (optional): Filter by status (default: ACTIVE)
 */
router.get('/suppliers', async (req: Request, res: Response) => {
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
router.get('/suppliers/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const supplier = await netureService.getSupplierBySlug(slug);

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
router.get('/partnership/requests', async (req: Request, res: Response) => {
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
router.get('/partnership/requests/:id', async (req: Request, res: Response) => {
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
 * First checks userId -> supplier mapping, then falls back to user.id
 */
async function getSupplierIdFromUser(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.user?.id) return null;

  // First try to find supplier linked to this user
  const linkedSupplierId = await netureService.getSupplierIdByUserId(req.user.id);
  if (linkedSupplierId) {
    return linkedSupplierId;
  }

  // Fallback: use user ID directly (for backwards compatibility)
  return req.user.id;
}

/**
 * GET /api/v1/neture/supplier/requests
 * Get supplier requests for authenticated supplier
 *
 * Query Parameters:
 * - status (optional): Filter by status ('pending', 'approved', 'rejected')
 * - serviceId (optional): Filter by service
 */
router.get('/supplier/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 인증 확인 및 supplierId 조회
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { status, serviceId } = req.query;

    const filters: { status?: SupplierRequestStatus; serviceId?: string } = {};

    if (status && typeof status === 'string') {
      filters.status = status as SupplierRequestStatus;
    }

    if (serviceId && typeof serviceId === 'string') {
      filters.serviceId = serviceId;
    }

    const requests = await netureService.getSupplierRequests(supplierId, filters);

    res.json({
      success: true,
      data: requests,
    });
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
 * Get supplier request detail
 */
router.get('/supplier/requests/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const request = await netureService.getSupplierRequestById(id, supplierId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Supplier request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
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
 * Approve a supplier request
 *
 * State transition: pending → approved
 */
router.post('/supplier/requests/:id/approve', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.approveSupplierRequest(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error approving supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to approve supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/reject
 * Reject a supplier request
 *
 * State transition: pending → rejected
 *
 * Body:
 * - reason (optional): Rejection reason
 */
router.post('/supplier/requests/:id/reject', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const result = await netureService.rejectSupplierRequest(id, supplierId, reason);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error rejecting supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests
 * Create a new supplier request (판매자 취급 요청)
 *
 * WO-S2S-FLOW-RECOVERY-PHASE1-V1:
 * - requireAuth 추가 (인증 필수)
 * - 인증된 사용자 정보를 sellerId/sellerName으로 자동 설정
 * - 중복 요청 시 409 Conflict
 */
router.post('/supplier/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // 인증된 사용자 정보를 기본값으로 사용
    const sellerId = data.sellerId || userId;
    const sellerName = data.sellerName || req.user?.name || '';

    // 필수 필드 검증
    if (!data.supplierId || !data.serviceId || !data.serviceName ||
        !data.productId || !data.productName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: supplierId, serviceId, serviceName, productId, productName',
      });
    }

    const result = await netureService.createSupplierRequest({
      ...data,
      sellerId,
      sellerName,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // WO-S2S-FLOW-RECOVERY-PHASE1-V1: 중복 요청 처리
    if ((error as Error).message === 'DUPLICATE_REQUEST') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_REQUEST',
        message: '이미 동일한 취급 요청이 존재합니다.',
        existingStatus: (error as any).existingStatus,
      });
    }

    logger.error('[Neture API] Error creating supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier request',
    });
  }
});

// ==================== Supplier Products (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2) ====================

/**
 * GET /api/v1/neture/supplier/products
 * Get products for authenticated supplier
 */
router.get('/supplier/products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

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
router.patch('/supplier/products/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { isActive, acceptsApplications } = req.body;

    const result = await netureService.updateSupplierProduct(id, supplierId, {
      isActive,
      acceptsApplications,
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

// ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4) ====================

/**
 * GET /api/v1/neture/supplier/orders/summary
 * Get service-wise order summary for supplier
 *
 * NOTE: Neture does NOT process orders.
 * This endpoint provides summary and links to navigate to each service.
 */
router.get('/supplier/orders/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

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

// ==================== Supplier Contents (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.1) ====================

/**
 * GET /api/v1/neture/supplier/contents
 * Get contents for authenticated supplier
 */
router.get('/supplier/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { type, status } = req.query;

    const filters: { type?: string; status?: string } = {};
    if (type && typeof type === 'string') filters.type = type;
    if (status && typeof status === 'string') filters.status = status;

    const contents = await netureService.getSupplierContents(supplierId, filters as any);

    res.json({
      success: true,
      data: contents,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier contents:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier contents',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/contents/:id
 * Get content detail
 */
router.get('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const content = await netureService.getSupplierContentById(id, supplierId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Content not found',
      });
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier content',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/contents
 * Create new content
 */
router.post('/supplier/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { type, title, description, body, imageUrl, availableServices, availableAreas } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'type and title are required',
      });
    }

    const result = await netureService.createSupplierContent(supplierId, {
      type,
      title,
      description,
      body,
      imageUrl,
      availableServices,
      availableAreas,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('[Neture API] Error creating supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier content',
    });
  }
});

/**
 * PATCH /api/v1/neture/supplier/contents/:id
 * Update content
 */
router.patch('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const result = await netureService.updateSupplierContent(id, supplierId, updates);

    if (!result.success) {
      const statusCode = result.error === 'CONTENT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error updating supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update supplier content',
    });
  }
});

/**
 * DELETE /api/v1/neture/supplier/contents/:id
 * Delete content
 */
router.delete('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.deleteSupplierContent(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'CONTENT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error deleting supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete supplier content',
    });
  }
});

// ==================== Dashboard Summary API ====================

/**
 * GET /api/v1/neture/supplier/dashboard/summary
 * Get dashboard summary for authenticated supplier
 */
router.get('/supplier/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

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
 * GET /api/v1/neture/admin/dashboard/summary
 * Get admin/operator dashboard summary (requires admin role)
 */
router.get('/admin/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

/**
 * POST /api/v1/neture/partner/dashboard/items
 * Add a product to partner's dashboard
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 */
router.post('/partner/dashboard/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/partner/dashboard/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
    const productMap = new Map<string, any>();

    for (const id of productIds) {
      const product = await glycopharmRepo.findProductById(id);
      if (product) {
        productMap.set(id, product);
      }
    }

    const data = items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name || '(삭제된 제품)',
        category: product?.category || 'other',
        price: product ? Number(product.price) : 0,
        pharmacyName: product?.pharmacy?.name,
        serviceId: item.serviceId,
        status: item.status,
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
router.patch('/partner/dashboard/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

// ==================== Request Events (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2) ====================

/**
 * GET /api/v1/neture/supplier/requests/:id/events
 * Get event logs for a specific request
 */
router.get('/supplier/requests/:id/events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.getRequestEvents(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error fetching request events:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch request events',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/events
 * Get all events for the supplier
 *
 * Query Parameters:
 * - eventType (optional): Filter by event type ('approved', 'rejected')
 * - limit (optional): Limit number of results
 */
router.get('/supplier/events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { eventType, limit } = req.query;

    const filters: { eventType?: string; limit?: number } = {};
    if (eventType && typeof eventType === 'string') filters.eventType = eventType as any;
    if (limit && typeof limit === 'string') filters.limit = parseInt(limit, 10);

    const events = await netureService.getSupplierEvents(supplierId, filters as any);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier events:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier events',
    });
  }
});

// ==================== Seller Product Query (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1) ====================

/**
 * GET /api/v1/neture/seller/my-products
 * 판매자의 승인된 취급 상품 목록 조회
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

    const result = await netureService.getSellerApprovedProducts(sellerId);
    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error fetching seller approved products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch seller approved products',
    });
  }
});

// ==================== Admin Request Management (WO-S2S-FLOW-RECOVERY-PHASE2-V1 T2) ====================

/**
 * GET /api/v1/neture/admin/requests
 * Admin: 전체 취급 요청 목록 조회 (cross-supplier)
 */
router.get('/admin/requests', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, supplierId, serviceId } = req.query;
    const filters: { status?: string; supplierId?: string; serviceId?: string } = {};
    if (status && typeof status === 'string') filters.status = status;
    if (supplierId && typeof supplierId === 'string') filters.supplierId = supplierId;
    if (serviceId && typeof serviceId === 'string') filters.serviceId = serviceId;

    const requests = await netureService.getAllSupplierRequests(filters);

    res.json({ success: true, data: requests });
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
 * Admin override: 소유권 무관 승인
 */
router.post('/admin/requests/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.approveSupplierRequestAsAdmin(id, actorId, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-approving supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to approve supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/reject
 * Admin override: 소유권 무관 거절
 */
router.post('/admin/requests/:id/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.rejectSupplierRequestAsAdmin(id, actorId, reason, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-rejecting supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject supplier request',
    });
  }
});

export default router;
