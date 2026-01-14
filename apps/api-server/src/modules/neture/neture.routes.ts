import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { NetureService } from './neture.service.js';
import { SupplierStatus, PartnershipStatus, SupplierRequestStatus } from './entities/index.js';
import logger from '../../utils/logger.js';

const router: ExpressRouter = Router();
const netureService = new NetureService();

// Extended Request type with user info
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
}

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
 * GET /api/v1/neture/supplier/requests
 * Get supplier requests for authenticated supplier
 *
 * Query Parameters:
 * - status (optional): Filter by status ('pending', 'approved', 'rejected')
 * - serviceId (optional): Filter by service
 */
router.get('/supplier/requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 인증 확인 (실제로는 미들웨어에서 처리)
    const supplierId = req.user?.supplierId || req.user?.id;

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
router.get('/supplier/requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = req.user?.supplierId || req.user?.id;

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
router.post('/supplier/requests/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = req.user?.supplierId || req.user?.id;

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
router.post('/supplier/requests/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = req.user?.supplierId || req.user?.id;

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
 * POST /api/v1/neture/supplier/requests (테스트/시드용)
 * Create a new supplier request
 */
router.post('/supplier/requests', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // 필수 필드 검증
    if (!data.supplierId || !data.sellerId || !data.sellerName ||
        !data.serviceId || !data.serviceName || !data.productId || !data.productName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
      });
    }

    const result = await netureService.createSupplierRequest(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('[Neture API] Error creating supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier request',
    });
  }
});

export default router;
