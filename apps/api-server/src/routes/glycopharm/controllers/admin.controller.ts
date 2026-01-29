/**
 * Glycopharm Admin Controller
 *
 * Phase B-1: Glycopharm API Implementation
 * Handles operator/admin application review and management
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { User } from '../../../modules/auth/entities/User.js';
import logger from '../../../utils/logger.js';

interface AuthRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
    email?: string;
    name?: string;
    roles?: string[];
    scopes?: string[];
  };
}

/**
 * Check if user has operator/admin role
 */
function isOperatorOrAdmin(roles: string[] = []): boolean {
  return (
    roles.includes('operator') ||
    roles.includes('admin') ||
    roles.includes('administrator') ||
    roles.includes('super_admin')
  );
}

/**
 * Generate unique pharmacy code
 */
function generatePharmacyCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GP-${timestamp}-${random}`;
}

/**
 * Create Admin Controller
 */
export function createAdminController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  _requireScope: (scope: string) => RequestHandler
): Router {
  const router = Router();

  /**
   * GET /api/v1/glycopharm/applications/admin/all
   * Get all applications (operator/admin only)
   */
  router.get(
    '/applications/admin/all',
    requireAuth,
    query('status').optional().isIn(['submitted', 'approved', 'rejected']),
    query('serviceType').optional().isIn(['dropshipping', 'sample_sales', 'digital_signage']),
    query('organizationType').optional().isIn(['pharmacy', 'pharmacy_chain']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const { status, serviceType, organizationType } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const userRepo = dataSource.getRepository(User);

        // Build query
        const queryBuilder = applicationRepo
          .createQueryBuilder('app')
          .orderBy('app.submittedAt', 'DESC')
          .skip(offset)
          .take(limit);

        if (status) {
          queryBuilder.andWhere('app.status = :status', { status });
        }

        if (organizationType) {
          queryBuilder.andWhere('app.organizationType = :organizationType', { organizationType });
        }

        // Filter by serviceType (JSONB array contains)
        if (serviceType) {
          queryBuilder.andWhere('app.serviceTypes @> :serviceType', {
            serviceType: JSON.stringify([serviceType]),
          });
        }

        const [applications, total] = await queryBuilder.getManyAndCount();

        // Fetch user info for each application
        const userIds = [...new Set(applications.map((app) => app.userId))];
        const users = userIds.length > 0
          ? await userRepo.findByIds(userIds)
          : [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        res.json({
          success: true,
          applications: applications.map((app) => {
            const appUser = userMap.get(app.userId);
            return {
              id: app.id,
              userId: app.userId,
              userName: appUser?.name || null,
              userEmail: appUser?.email || null,
              organizationType: app.organizationType,
              organizationName: app.organizationName,
              businessNumber: app.businessNumber,
              serviceTypes: app.serviceTypes,
              note: app.note,
              status: app.status,
              rejectionReason: app.rejectionReason,
              submittedAt: app.submittedAt,
              decidedAt: app.decidedAt,
              decidedBy: app.decidedBy,
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Get all applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * PATCH /api/v1/glycopharm/applications/:id/review
   * Approve or reject an application (operator/admin only)
   */
  router.patch(
    '/applications/:id/review',
    requireAuth,
    param('id').isUUID(),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('rejectionReason').optional().isString().isLength({ max: 2000 }),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        // Validate rejection reason is required when rejecting
        if (status === 'rejected' && !rejectionReason) {
          res.status(400).json({
            error: 'Bad request',
            code: 'REJECTION_REASON_REQUIRED',
            message: 'Rejection reason is required when rejecting an application',
          });
          return;
        }

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

        const application = await applicationRepo.findOne({
          where: { id },
        });

        if (!application) {
          res.status(404).json({
            error: 'Not found',
            code: 'APPLICATION_NOT_FOUND',
          });
          return;
        }

        // Check if already decided
        if (application.status !== 'submitted') {
          res.status(409).json({
            error: 'Conflict',
            code: 'ALREADY_DECIDED',
            message: `Application already ${application.status}`,
          });
          return;
        }

        // Update application
        application.status = status;
        application.decidedAt = new Date();
        application.decidedBy = userId;

        if (status === 'rejected') {
          application.rejectionReason = rejectionReason;
        }

        await applicationRepo.save(application);

        // If approved, create pharmacy
        let pharmacy: GlycopharmPharmacy | null = null;
        if (status === 'approved') {
          // Check if pharmacy already exists for this user
          const existingPharmacy = await pharmacyRepo.findOne({
            where: { created_by_user_id: application.userId },
          });

          if (!existingPharmacy) {
            // Create new pharmacy with enabled services from application
            pharmacy = new GlycopharmPharmacy();
            pharmacy.name = application.organizationName;
            pharmacy.code = generatePharmacyCode();
            pharmacy.business_number = application.businessNumber;
            pharmacy.status = 'active';
            pharmacy.created_by_user_id = application.userId;
            pharmacy.enabled_services = application.serviceTypes;

            await pharmacyRepo.save(pharmacy);

            logger.info(
              `[Glycopharm Admin] Pharmacy created: ${pharmacy.id} for user ${application.userId}`
            );
          } else {
            // Pharmacy already exists - merge new services with existing
            pharmacy = existingPharmacy;
            const currentServices = pharmacy.enabled_services || [];
            const newServices = application.serviceTypes.filter(
              (s) => !currentServices.includes(s)
            );

            if (newServices.length > 0) {
              pharmacy.enabled_services = [...currentServices, ...newServices];
              await pharmacyRepo.save(pharmacy);
              logger.info(
                `[Glycopharm Admin] Pharmacy ${existingPharmacy.id} updated with new services: ${newServices.join(', ')}`
              );
            } else {
              logger.info(
                `[Glycopharm Admin] Pharmacy already exists: ${existingPharmacy.id} for user ${application.userId}`
              );
            }
          }
        }

        logger.info(
          `[Glycopharm Admin] Application ${id} ${status} by ${userId}`
        );

        res.json({
          success: true,
          message: `Application ${status} successfully`,
          application: {
            id: application.id,
            status: application.status,
            decidedAt: application.decidedAt,
            decidedBy: application.decidedBy,
            rejectionReason: application.rejectionReason,
          },
          pharmacy: pharmacy
            ? {
                id: pharmacy.id,
                name: pharmacy.name,
                code: pharmacy.code,
                status: pharmacy.status,
              }
            : null,
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Review application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glycopharm/applications/:id/admin
   * Get application detail for admin (operator/admin only)
   */
  router.get(
    '/applications/:id/admin',
    requireAuth,
    param('id').isUUID(),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const { id } = req.params;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const userRepo = dataSource.getRepository(User);
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

        const application = await applicationRepo.findOne({
          where: { id },
        });

        if (!application) {
          res.status(404).json({
            error: 'Not found',
            code: 'APPLICATION_NOT_FOUND',
          });
          return;
        }

        // Get user info
        const appUser = await userRepo.findOne({
          where: { id: application.userId },
        });

        // Get pharmacy if exists
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: application.userId },
        });

        res.json({
          success: true,
          application: {
            id: application.id,
            userId: application.userId,
            userName: appUser?.name || null,
            userEmail: appUser?.email || null,
            userPhone: appUser?.phone || null,
            organizationType: application.organizationType,
            organizationName: application.organizationName,
            businessNumber: application.businessNumber,
            serviceTypes: application.serviceTypes,
            note: application.note,
            status: application.status,
            rejectionReason: application.rejectionReason,
            submittedAt: application.submittedAt,
            decidedAt: application.decidedAt,
            decidedBy: application.decidedBy,
            metadata: application.metadata,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          },
          pharmacy: pharmacy
            ? {
                id: pharmacy.id,
                name: pharmacy.name,
                code: pharmacy.code,
                address: pharmacy.address,
                phone: pharmacy.phone,
                email: pharmacy.email,
                ownerName: pharmacy.owner_name,
                businessNumber: pharmacy.business_number,
                status: pharmacy.status,
                createdAt: pharmacy.created_at,
              }
            : null,
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Get application detail error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * POST /api/v1/glycopharm/admin/products/activate-all
   * Activate all products (set status to 'active')
   *
   * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T3)
   * This is a one-time operation to fix seeded products that don't have active status
   */
  router.post(
    '/admin/products/activate-all',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const productRepo = dataSource.getRepository(GlycopharmProduct);

        // Get current counts
        const totalCount = await productRepo.count();
        const activeCount = await productRepo.count({ where: { status: 'active' } });

        logger.info(`[Glycopharm Admin] Current status - Total: ${totalCount}, Active: ${activeCount}`);

        // Update all non-active products to active
        const updateResult = await productRepo
          .createQueryBuilder()
          .update(GlycopharmProduct)
          .set({ status: 'active', updated_at: new Date() })
          .where('status != :status', { status: 'active' })
          .execute();

        const updatedCount = updateResult.affected || 0;

        // Get new counts
        const newActiveCount = await productRepo.count({ where: { status: 'active' } });

        logger.info(`[Glycopharm Admin] Updated ${updatedCount} products to active status`);
        logger.info(`[Glycopharm Admin] New status - Total: ${totalCount}, Active: ${newActiveCount}`);

        res.json({
          success: true,
          data: {
            totalProducts: totalCount,
            previousActiveCount: activeCount,
            updatedCount,
            currentActiveCount: newActiveCount,
          },
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Activate products error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glycopharm/admin/products/stats
   * Get product statistics
   */
  router.get(
    '/admin/products/stats',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const productRepo = dataSource.getRepository(GlycopharmProduct);

        const total = await productRepo.count();
        const active = await productRepo.count({ where: { status: 'active' } });
        const draft = await productRepo.count({ where: { status: 'draft' } });
        const inactive = await productRepo.count({ where: { status: 'inactive' } });
        const discontinued = await productRepo.count({ where: { status: 'discontinued' } });

        res.json({
          success: true,
          data: {
            total,
            byStatus: {
              active,
              draft,
              inactive,
              discontinued,
            },
          },
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Get product stats error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
