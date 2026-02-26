/**
 * Glycopharm Admin Controller
 *
 * Phase B-1: Glycopharm API Implementation
 * Handles operator/admin application review and management
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { GlycopharmPharmacyExtension } from '../entities/glycopharm-pharmacy-extension.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { User } from '../../../modules/auth/entities/User.js';
import logger from '../../../utils/logger.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../../utils/role.utils.js';
import { autoListPublicProductsForOrg } from '../../../utils/auto-listing.utils.js';

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
 *
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.2: GlycoPharm)
 * - **GlycoPharm 서비스는 오직 glycopharm:* role만 신뢰**
 * - Priority 1: GlycoPharm prefixed roles ONLY (glycopharm:admin, glycopharm:operator)
 * - Priority 2: Legacy role detection → Log + DENY
 * - platform:admin 허용 (플랫폼 감독)
 */
function isOperatorOrAdmin(roles: string[] = [], userId: string = 'unknown'): boolean {
  // Priority 1: Check GlycoPharm-specific prefixed roles
  const hasGlycopharmRole = hasAnyServiceRole(roles, [
    'glycopharm:admin',
    'glycopharm:operator',
    'platform:admin',
    'platform:super_admin'
  ]);

  if (hasGlycopharmRole) {
    return true;
  }

  // Priority 2: Detect legacy roles and DENY access
  const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
  const detectedLegacyRoles = roles.filter(r => legacyRoles.includes(r));

  if (detectedLegacyRoles.length > 0) {
    // Log legacy role usage and deny access
    detectedLegacyRoles.forEach(role => {
      logLegacyRoleUsage(userId, role, 'glycopharm/admin.controller:isOperatorOrAdmin');
    });
    return false; // ❌ DENY - Legacy roles no longer grant access
  }

  // Detect other service roles and deny
  const hasOtherServiceRole = roles.some(r =>
    r.startsWith('kpa:') ||
    r.startsWith('neture:') ||
    r.startsWith('cosmetics:') ||
    r.startsWith('glucoseview:')
  );

  if (hasOtherServiceRole) {
    // Other service admins do NOT have GlycoPharm access
    return false; // ❌ DENY - GlycoPharm requires glycopharm:* roles
  }

  return false;
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
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
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
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
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
        const orgRepo = dataSource.getRepository(OrganizationStore);
        const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);

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

        // If approved, create pharmacy (organization + extension + enrollment)
        let createdOrg: OrganizationStore | null = null;
        if (status === 'approved') {
          // Check if pharmacy already exists for this user
          const existingOrg = await orgRepo.findOne({
            where: { created_by_user_id: application.userId },
          });

          if (!existingOrg) {
            // WO-CORE-STORE-SLUG-TRANSACTION-HARDENING-V1: Atomic pharmacy + slug creation
            const queryRunner = dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const pharmacyCode = generatePharmacyCode();

              // Use StoreSlugService with EntityManager for transaction support
              const slugService = new StoreSlugService(queryRunner.manager);

              // WO-CORE-STORE-REQUESTED-SLUG-V1: Compute slug value
              let slugValue: string;
              if (application.requestedSlug) {
                const availability = await slugService.checkAvailability(application.requestedSlug);
                if (!availability.available) {
                  throw new Error(`Requested slug '${application.requestedSlug}' is no longer available: ${availability.reason}`);
                }
                slugValue = application.requestedSlug;
              } else {
                slugValue = await slugService.generateUniqueSlug(application.organizationName);
              }

              // Create organization
              const org = new OrganizationStore();
              org.name = application.organizationName;
              org.code = pharmacyCode;
              org.type = 'pharmacy';
              org.isActive = true;
              org.level = 0;
              org.path = pharmacyCode;
              org.business_number = application.businessNumber ? normalizeBusinessNumber(application.businessNumber) : '';
              org.created_by_user_id = application.userId;

              createdOrg = await queryRunner.manager.save(OrganizationStore, org);

              // Create glycopharm extension
              const ext = new GlycopharmPharmacyExtension();
              ext.organization_id = createdOrg.id;
              ext.enabled_services = application.serviceTypes;
              await queryRunner.manager.save(GlycopharmPharmacyExtension, ext);

              // Create service enrollment
              await queryRunner.manager.query(
                `INSERT INTO organization_service_enrollments (organization_id, service_code, status, enrolled_at)
                 VALUES ($1, 'glycopharm', 'active', NOW())`,
                [createdOrg.id],
              );

              // Register slug in platform-wide registry (same transaction)
              await slugService.reserveSlug({
                storeId: createdOrg.id,
                serviceKey: 'glycopharm',
                slug: slugValue,
              });

              await queryRunner.commitTransaction();

              logger.info(
                `[Glycopharm Admin] Pharmacy created: ${createdOrg.id} for user ${application.userId}`
              );
            } catch (txError) {
              await queryRunner.rollbackTransaction();
              throw txError;
            } finally {
              await queryRunner.release();
            }
          } else {
            // Pharmacy already exists - merge new services with existing
            createdOrg = existingOrg;
            const existingExt = await extRepo.findOne({ where: { organization_id: existingOrg.id } });
            const currentServices = existingExt?.enabled_services || [];
            const newServices = application.serviceTypes.filter(
              (s: string) => !currentServices.includes(s as any)
            );

            if (newServices.length > 0) {
              if (existingExt) {
                existingExt.enabled_services = [...currentServices, ...newServices] as any;
                await extRepo.save(existingExt);
              } else {
                const newExt = extRepo.create({
                  organization_id: existingOrg.id,
                  enabled_services: newServices as any,
                });
                await extRepo.save(newExt);
              }
              logger.info(
                `[Glycopharm Admin] Pharmacy ${existingOrg.id} updated with new services: ${newServices.join(', ')}`
              );
            } else {
              logger.info(
                `[Glycopharm Admin] Pharmacy already exists: ${existingOrg.id} for user ${application.userId}`
              );
            }
          }

          // WO-ROLE-NORMALIZATION-PHASE3-A-V1: relation-based ownership via organization_members
          if (createdOrg) {
            await dataSource.query(
              `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
               VALUES (uuid_generate_v4(), $1, $2, 'owner', false, NOW(), NOW(), NOW())
               ON CONFLICT (organization_id, user_id) DO NOTHING`,
              [createdOrg.id, application.userId]
            );
            logger.info(
              `[Glycopharm Admin] organization_members owner record created for user ${application.userId} → org ${createdOrg.id}`
            );

            // WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1: Tier 1 자동 확산
            autoListPublicProductsForOrg(dataSource, createdOrg.id, 'glycopharm')
              .then((count) => logger.info(`[Glycopharm Admin] Auto-listed ${count} PUBLIC products for org ${createdOrg.id}`))
              .catch((err) => logger.error('[Glycopharm Admin] Auto-listing failed:', err));
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
          pharmacy: createdOrg
            ? {
                id: createdOrg.id,
                name: createdOrg.name,
                code: createdOrg.code,
                status: createdOrg.isActive ? 'active' : 'inactive',
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
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
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
        const orgRepo = dataSource.getRepository(OrganizationStore);
        const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);

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

        // Get pharmacy (organization) if exists
        const pharmacy = await orgRepo.findOne({
          where: { created_by_user_id: application.userId },
        });
        const extension = pharmacy
          ? await extRepo.findOne({ where: { organization_id: pharmacy.id } })
          : null;

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
                email: null, // GAP: email not yet migrated
                ownerName: extension?.owner_name || null,
                businessNumber: pharmacy.business_number,
                status: pharmacy.isActive ? 'active' : 'inactive',
                createdAt: pharmacy.createdAt,
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
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
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
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
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

  /**
   * POST /api/v1/glycopharm/admin/migrate/add-product-fields
   * Add missing fields to glycopharm_products table
   *
   * This is a one-time migration to sync Entity with production DB
   */
  router.post(
    '/admin/migrate/add-product-fields',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles, user?.id || 'unknown')) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        logger.info('[Glycopharm Admin] Running product fields migration');

        // Execute migration SQL directly
        const sql = `
          -- Add subtitle for product listing
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500);

          -- Add short_description for listing pages
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS short_description TEXT;

          -- Add barcodes (JSONB array)
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS barcodes JSONB;

          -- Add images (JSONB array)
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS images JSONB;

          -- Add origin and legal fields
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100);
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100);
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS certification_ids JSONB;

          -- Add usage information
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS usage_info TEXT;
          ALTER TABLE glycopharm_products ADD COLUMN IF NOT EXISTS caution_info TEXT;
        `;

        await dataSource.query(sql);

        logger.info('[Glycopharm Admin] Product fields migration completed');

        res.json({
          success: true,
          message: 'Product fields migration completed successfully',
          fieldsAdded: [
            'subtitle',
            'short_description',
            'barcodes',
            'images',
            'origin_country',
            'legal_category',
            'certification_ids',
            'usage_info',
            'caution_info',
          ],
        });
      } catch (error) {
        logger.error('[Glycopharm Admin] Migration error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
