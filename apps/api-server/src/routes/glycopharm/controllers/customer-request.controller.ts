/**
 * Customer Request Controller
 *
 * WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1
 *
 * API endpoints for managing customer requests in Glycopharm:
 * - POST /requests - Create a new request
 * - GET /requests - List requests with filters
 * - PATCH /requests/:id/approve - Approve a request
 * - PATCH /requests/:id/reject - Reject a request
 * - GET /requests/pending-count - Get pending request count (for dashboard)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, In } from 'typeorm';
import {
  GlycopharmCustomerRequest,
  type CustomerRequestPurpose,
  type CustomerRequestSourceType,
  type CustomerRequestStatus,
} from '../entities/customer-request.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

/** Request creation DTO */
interface CreateRequestDto {
  pharmacyId: string;
  purpose: CustomerRequestPurpose;
  sourceType: CustomerRequestSourceType;
  sourceId?: string;
  customerContact?: string;
  customerName?: string;
  metadata?: Record<string, any>;
}

/** Request list query params */
interface ListRequestsQuery {
  status?: CustomerRequestStatus | CustomerRequestStatus[];
  purpose?: CustomerRequestPurpose;
  page?: string;
  pageSize?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Create Customer Request Controller
 */
export function createCustomerRequestController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const requestRepo = dataSource.getRepository(GlycopharmCustomerRequest);
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

  /**
   * POST /requests
   * Create a new customer request
   * Public endpoint (no auth required for customer-initiated requests)
   */
  router.post('/requests', async (req: Request, res: Response): Promise<void> => {
    try {
      const body: CreateRequestDto = req.body;

      // Validation
      if (!body.pharmacyId) {
        res.status(400).json({
          success: false,
          error: 'pharmacyId is required',
          code: 'MISSING_PHARMACY_ID',
        });
        return;
      }

      if (!body.purpose) {
        res.status(400).json({
          success: false,
          error: 'purpose is required',
          code: 'MISSING_PURPOSE',
        });
        return;
      }

      if (!body.sourceType) {
        res.status(400).json({
          success: false,
          error: 'sourceType is required',
          code: 'MISSING_SOURCE_TYPE',
        });
        return;
      }

      // Validate purpose value
      const validPurposes: CustomerRequestPurpose[] = [
        'consultation',
        'sample',
        'order',
        'survey_followup',
        'info_followup',
      ];
      if (!validPurposes.includes(body.purpose)) {
        res.status(400).json({
          success: false,
          error: `Invalid purpose. Valid values: ${validPurposes.join(', ')}`,
          code: 'INVALID_PURPOSE',
        });
        return;
      }

      // Validate sourceType value
      const validSourceTypes: CustomerRequestSourceType[] = [
        'qr',
        'tablet',
        'web',
        'signage',
        'print',
      ];
      if (!validSourceTypes.includes(body.sourceType)) {
        res.status(400).json({
          success: false,
          error: `Invalid sourceType. Valid values: ${validSourceTypes.join(', ')}`,
          code: 'INVALID_SOURCE_TYPE',
        });
        return;
      }

      // Verify pharmacy exists
      const pharmacy = await pharmacyRepo.findOne({
        where: { id: body.pharmacyId },
      });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found',
          code: 'PHARMACY_NOT_FOUND',
        });
        return;
      }

      // Create request
      const customerRequest = requestRepo.create({
        pharmacyId: body.pharmacyId,
        purpose: body.purpose,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        customerContact: body.customerContact,
        customerName: body.customerName,
        status: 'pending',
        requestedAt: new Date(),
        metadata: body.metadata || {},
      });

      const saved = await requestRepo.save(customerRequest);

      res.status(201).json({
        success: true,
        data: {
          id: saved.id,
          pharmacyId: saved.pharmacyId,
          purpose: saved.purpose,
          sourceType: saved.sourceType,
          status: saved.status,
          requestedAt: saved.requestedAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Failed to create customer request:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * GET /requests
   * List customer requests for the pharmacy
   * Requires authentication (pharmacy staff)
   */
  router.get('/requests', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found for this user',
          code: 'PHARMACY_NOT_FOUND',
        });
        return;
      }

      const query = req.query as ListRequestsQuery;
      const page = parseInt(query.page || '1');
      const pageSize = Math.min(parseInt(query.pageSize || '20'), 100);

      // Build query
      const queryBuilder = requestRepo
        .createQueryBuilder('request')
        .where('request.pharmacy_id = :pharmacyId', { pharmacyId: pharmacy.id });

      // Status filter
      if (query.status) {
        if (Array.isArray(query.status)) {
          queryBuilder.andWhere('request.status IN (:...statuses)', { statuses: query.status });
        } else {
          queryBuilder.andWhere('request.status = :status', { status: query.status });
        }
      }

      // Purpose filter
      if (query.purpose) {
        queryBuilder.andWhere('request.purpose = :purpose', { purpose: query.purpose });
      }

      // Date range filter
      if (query.fromDate) {
        queryBuilder.andWhere('request.requested_at >= :fromDate', { fromDate: query.fromDate });
      }
      if (query.toDate) {
        queryBuilder.andWhere('request.requested_at <= :toDate', { toDate: query.toDate });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination and get results
      const requests = await queryBuilder
        .orderBy('request.requested_at', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // Map to response format
      const items = requests.map((r) => ({
        id: r.id,
        purpose: r.purpose,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        status: r.status,
        customerContact: r.customerContact,
        customerName: r.customerName,
        requestedAt: r.requestedAt.toISOString(),
        handledBy: r.handledBy,
        handledAt: r.handledAt?.toISOString(),
        handleNote: r.handleNote,
        metadata: r.metadata,
      }));

      res.json({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      console.error('Failed to list customer requests:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * GET /requests/pending-count
   * Get pending request count for dashboard
   * Requires authentication
   */
  router.get('/requests/pending-count', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.json({
          success: true,
          data: { count: 0 },
        });
        return;
      }

      const count = await requestRepo.count({
        where: {
          pharmacyId: pharmacy.id,
          status: 'pending',
        },
      });

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      console.error('Failed to get pending request count:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PATCH /requests/:id/approve
   * Approve a customer request
   * Requires authentication
   */
  router.patch('/requests/:id/approve', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { id } = req.params;
      const { note } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found for this user',
          code: 'PHARMACY_NOT_FOUND',
        });
        return;
      }

      // Find the request
      const customerRequest = await requestRepo.findOne({
        where: { id, pharmacyId: pharmacy.id },
      });

      if (!customerRequest) {
        res.status(404).json({
          success: false,
          error: 'Request not found',
          code: 'REQUEST_NOT_FOUND',
        });
        return;
      }

      if (customerRequest.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: `Cannot approve request with status: ${customerRequest.status}`,
          code: 'INVALID_STATUS',
        });
        return;
      }

      // Update request
      customerRequest.status = 'approved';
      customerRequest.handledBy = userId;
      customerRequest.handledAt = new Date();
      customerRequest.handleNote = note;

      const updated = await requestRepo.save(customerRequest);

      res.json({
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          handledAt: updated.handledAt?.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Failed to approve customer request:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PATCH /requests/:id/reject
   * Reject a customer request
   * Requires authentication
   */
  router.patch('/requests/:id/reject', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { id } = req.params;
      const { note } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found for this user',
          code: 'PHARMACY_NOT_FOUND',
        });
        return;
      }

      // Find the request
      const customerRequest = await requestRepo.findOne({
        where: { id, pharmacyId: pharmacy.id },
      });

      if (!customerRequest) {
        res.status(404).json({
          success: false,
          error: 'Request not found',
          code: 'REQUEST_NOT_FOUND',
        });
        return;
      }

      if (customerRequest.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: `Cannot reject request with status: ${customerRequest.status}`,
          code: 'INVALID_STATUS',
        });
        return;
      }

      // Update request
      customerRequest.status = 'rejected';
      customerRequest.handledBy = userId;
      customerRequest.handledAt = new Date();
      customerRequest.handleNote = note;

      const updated = await requestRepo.save(customerRequest);

      res.json({
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          handledAt: updated.handledAt?.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Failed to reject customer request:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
