/**
 * GlucoseView Controller
 *
 * Phase C-1: GlucoseView API Implementation
 * API endpoints for vendors, view profiles, and connections
 *
 * IMPORTANT: This controller does NOT handle raw CGM data.
 * It only manages metadata about vendors, display configurations, and connection status.
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { GlucoseViewService } from '../services/glucoseview.service.js';
import type {
  ListVendorsQueryDto,
  ListViewProfilesQueryDto,
  ListConnectionsQueryDto,
  CreateVendorRequestDto,
  UpdateVendorRequestDto,
  CreateViewProfileRequestDto,
  UpdateViewProfileRequestDto,
  CreateConnectionRequestDto,
} from '../dto/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  next();
};

export function createGlucoseViewController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const service = new GlucoseViewService(dataSource);

  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  /**
   * GET /vendors - List active vendors (public)
   */
  router.get('/vendors', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.listActiveVendors();
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list vendors:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /view-profiles - List active view profiles (public)
   */
  router.get('/view-profiles', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.listActiveViewProfiles();
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list view profiles:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  // ============================================================================
  // PATIENT ROUTES (CGM Summary Data - Read Only)
  // ============================================================================

  /**
   * GET /patients - List all patients with summaries (public for pharmacist app)
   *
   * Returns patient list with:
   * - alias (masked name)
   * - status (normal/warning/risk)
   * - periodDays
   * - trend (improving/worsening/stable)
   * - lastUpdated
   *
   * Does NOT return raw CGM data.
   */
  router.get('/patients', async (req: Request, res: Response): Promise<void> => {
    try {
      const queryDto = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await service.listPatients(queryDto);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list patients:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /patients/:id - Get patient detail (public for pharmacist app)
   *
   * Returns patient detail with:
   * - alias, registeredAt
   * - currentSummary (period, status, summaryText)
   * - previousSummary (optional)
   * - insights (max 3)
   * - comparison (trend, description)
   *
   * Does NOT return raw CGM data.
   */
  router.get(
    '/patients/:id',
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const patient = await service.getPatientById(req.params.id);
        if (!patient) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Patient not found' },
          });
          return;
        }
        res.json({ data: patient });
      } catch (error: any) {
        console.error('Failed to get patient:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES - Vendors
  // ============================================================================

  /**
   * GET /admin/vendors - List all vendors (admin)
   */
  router.get(
    '/admin/vendors',
    requireAuth,
    requireScope('glucoseview:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const queryDto: ListVendorsQueryDto = {
          status: req.query.status as any,
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const result = await service.listVendors(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list vendors:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /admin/vendors - Create vendor (admin)
   */
  router.post(
    '/admin/vendors',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('code').isString().notEmpty().withMessage('Code is required'),
      body('description').optional().isString(),
      body('logo_url').optional().isString(),
      body('website_url').optional().isString(),
      body('supported_devices').optional().isArray(),
      body('integration_type').optional().isIn(['api', 'manual', 'file_import']),
      body('status').optional().isIn(['active', 'inactive', 'planned']),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: CreateVendorRequestDto = req.body;
        const vendor = await service.createVendor(dto);
        res.status(201).json({ data: vendor });
      } catch (error: any) {
        console.error('Failed to create vendor:', error);
        if (error.message === 'Vendor code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/vendors/:id - Get vendor detail (admin)
   */
  router.get(
    '/admin/vendors/:id',
    requireAuth,
    requireScope('glucoseview:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const vendor = await service.getVendorById(req.params.id);
        if (!vendor) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Vendor not found' },
          });
          return;
        }
        res.json({ data: vendor });
      } catch (error: any) {
        console.error('Failed to get vendor:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PUT /admin/vendors/:id - Update vendor (admin)
   */
  router.put(
    '/admin/vendors/:id',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString(),
      body('code').optional().isString(),
      body('description').optional().isString(),
      body('logo_url').optional().isString(),
      body('website_url').optional().isString(),
      body('supported_devices').optional().isArray(),
      body('integration_type').optional().isIn(['api', 'manual', 'file_import']),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const dto: UpdateVendorRequestDto = req.body;
        const vendor = await service.updateVendor(req.params.id, dto);
        if (!vendor) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Vendor not found' },
          });
          return;
        }
        res.json({ data: vendor });
      } catch (error: any) {
        console.error('Failed to update vendor:', error);
        if (error.message === 'Vendor code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /admin/vendors/:id/status - Update vendor status (admin)
   */
  router.patch(
    '/admin/vendors/:id/status',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['active', 'inactive', 'planned']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const vendor = await service.updateVendorStatus(req.params.id, req.body.status);
        if (!vendor) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Vendor not found' },
          });
          return;
        }
        res.json({ data: vendor });
      } catch (error: any) {
        console.error('Failed to update vendor status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES - View Profiles
  // ============================================================================

  /**
   * GET /admin/view-profiles - List all view profiles (admin)
   */
  router.get(
    '/admin/view-profiles',
    requireAuth,
    requireScope('glucoseview:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const queryDto: ListViewProfilesQueryDto = {
          status: req.query.status as any,
          summary_level: req.query.summary_level as any,
          chart_type: req.query.chart_type as any,
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const result = await service.listViewProfiles(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list view profiles:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /admin/view-profiles - Create view profile (admin)
   */
  router.post(
    '/admin/view-profiles',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('code').isString().notEmpty().withMessage('Code is required'),
      body('description').optional().isString(),
      body('summary_level').optional().isIn(['simple', 'standard', 'detailed']),
      body('chart_type').optional().isIn(['daily', 'weekly', 'trend', 'agp']),
      body('time_range_days').optional().isInt({ min: 1, max: 365 }),
      body('show_tir').optional().isBoolean(),
      body('show_average').optional().isBoolean(),
      body('show_variability').optional().isBoolean(),
      body('target_low').optional().isInt({ min: 40, max: 100 }),
      body('target_high').optional().isInt({ min: 140, max: 300 }),
      body('status').optional().isIn(['active', 'inactive', 'draft']),
      body('is_default').optional().isBoolean(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: CreateViewProfileRequestDto = req.body;
        const profile = await service.createViewProfile(dto);
        res.status(201).json({ data: profile });
      } catch (error: any) {
        console.error('Failed to create view profile:', error);
        if (error.message === 'View profile code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/view-profiles/:id - Get view profile detail (admin)
   */
  router.get(
    '/admin/view-profiles/:id',
    requireAuth,
    requireScope('glucoseview:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const profile = await service.getViewProfileById(req.params.id);
        if (!profile) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'View profile not found' },
          });
          return;
        }
        res.json({ data: profile });
      } catch (error: any) {
        console.error('Failed to get view profile:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PUT /admin/view-profiles/:id - Update view profile (admin)
   */
  router.put(
    '/admin/view-profiles/:id',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString(),
      body('code').optional().isString(),
      body('description').optional().isString(),
      body('summary_level').optional().isIn(['simple', 'standard', 'detailed']),
      body('chart_type').optional().isIn(['daily', 'weekly', 'trend', 'agp']),
      body('time_range_days').optional().isInt({ min: 1, max: 365 }),
      body('show_tir').optional().isBoolean(),
      body('show_average').optional().isBoolean(),
      body('show_variability').optional().isBoolean(),
      body('target_low').optional().isInt({ min: 40, max: 100 }),
      body('target_high').optional().isInt({ min: 140, max: 300 }),
      body('is_default').optional().isBoolean(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const dto: UpdateViewProfileRequestDto = req.body;
        const profile = await service.updateViewProfile(req.params.id, dto);
        if (!profile) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'View profile not found' },
          });
          return;
        }
        res.json({ data: profile });
      } catch (error: any) {
        console.error('Failed to update view profile:', error);
        if (error.message === 'View profile code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /admin/view-profiles/:id/status - Update view profile status (admin)
   */
  router.patch(
    '/admin/view-profiles/:id/status',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['active', 'inactive', 'draft']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const profile = await service.updateViewProfileStatus(req.params.id, req.body.status);
        if (!profile) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'View profile not found' },
          });
          return;
        }
        res.json({ data: profile });
      } catch (error: any) {
        console.error('Failed to update view profile status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES - Connections
  // ============================================================================

  /**
   * GET /admin/connections - List all connections (admin)
   */
  router.get(
    '/admin/connections',
    requireAuth,
    requireScope('glucoseview:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const queryDto: ListConnectionsQueryDto = {
          pharmacy_id: req.query.pharmacy_id as string,
          vendor_id: req.query.vendor_id as string,
          status: req.query.status as any,
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const result = await service.listConnections(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list connections:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /admin/connections - Create connection (admin)
   */
  router.post(
    '/admin/connections',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      body('vendor_id').isUUID().withMessage('Vendor ID is required'),
      body('pharmacy_id').optional().isUUID(),
      body('pharmacy_name').optional().isString(),
      body('status').optional().isIn(['pending', 'active', 'suspended', 'disconnected']),
      body('notes').optional().isString(),
      body('config').optional().isObject(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: CreateConnectionRequestDto = req.body;
        const connection = await service.createConnection(dto);
        res.status(201).json({ data: connection });
      } catch (error: any) {
        console.error('Failed to create connection:', error);
        if (error.message === 'Connection already exists for this pharmacy and vendor') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/connections/:id - Get connection detail (admin)
   */
  router.get(
    '/admin/connections/:id',
    requireAuth,
    requireScope('glucoseview:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const connection = await service.getConnectionById(req.params.id);
        if (!connection) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Connection not found' },
          });
          return;
        }
        res.json({ data: connection });
      } catch (error: any) {
        console.error('Failed to get connection:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /admin/connections/:id/status - Update connection status (admin)
   */
  router.patch(
    '/admin/connections/:id/status',
    requireAuth,
    requireScope('glucoseview:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['pending', 'active', 'suspended', 'disconnected']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const connection = await service.updateConnectionStatus(req.params.id, req.body.status);
        if (!connection) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Connection not found' },
          });
          return;
        }
        res.json({ data: connection });
      } catch (error: any) {
        console.error('Failed to update connection status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
