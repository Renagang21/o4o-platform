/**
 * Store Applications Controller
 *
 * WO-O4O-STORE-APPLICATIONS-API-IMPLEMENTATION-V1:
 * 프론트엔드(web-glycopharm)가 호출하는 /store-applications/* 경로 매핑.
 * 기존 GlycopharmApplication 엔티티 재사용, 기존 컨트롤러 미수정.
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { StoreSlugService, normalizeSlug } from '@o4o/platform-core/store-identity';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { GlycopharmPharmacyExtension } from '../entities/glycopharm-pharmacy-extension.entity.js';
import { User } from '../../../modules/auth/entities/User.js';
import logger from '../../../utils/logger.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import { autoListPublicProductsForOrg } from '../../../utils/auto-listing.utils.js';
import { emailService } from '../../../services/email.service.js';
import { OperatorNotificationController } from '../../../controllers/OperatorNotificationController.js';

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
 * Check if user has operator/admin role for GlycoPharm
 */
function isOperatorOrAdmin(roles: string[] = []): boolean {
  return hasAnyServiceRole(roles, [
    'glycopharm:admin',
    'glycopharm:operator',
    'platform:admin',
    'platform:super_admin',
  ]);
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
 * Create Store Applications Controller
 *
 * Mounted at /store-applications in glycopharm.routes.ts
 * All paths below are relative to that mount point.
 */
export function createStoreApplicationsController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  // ============================================================================
  // GET /store-applications/mine — 내 신청서 조회
  // ============================================================================
  router.get(
    '/mine',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

        // 최신 신청서 1건 (draft 또는 submitted 등 모든 상태 포함)
        const application = await applicationRepo.findOne({
          where: { userId },
          order: { createdAt: 'DESC' },
        });

        res.json({
          success: true,
          data: application
            ? {
                id: application.id,
                userId: application.userId,
                organizationType: application.organizationType,
                organizationName: application.organizationName,
                businessNumber: application.businessNumber,
                serviceTypes: application.serviceTypes,
                note: application.note,
                requestedSlug: application.requestedSlug,
                status: application.status,
                rejectionReason: application.rejectionReason,
                submittedAt: application.submittedAt,
                decidedAt: application.decidedAt,
                metadata: application.metadata,
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
              }
            : null,
        });
      } catch (error) {
        logger.error('[StoreApplications] Get mine error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // POST /store-applications/draft — 임시저장
  // ============================================================================
  router.post(
    '/draft',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const { organizationType, organizationName, businessNumber, serviceTypes, note, requestedSlug } = req.body;

        // 기존 draft 있으면 upsert
        let application = await applicationRepo.findOne({
          where: { userId, status: 'draft' as any },
        });

        if (application) {
          // Update existing draft
          if (organizationType !== undefined) application.organizationType = organizationType;
          if (organizationName !== undefined) application.organizationName = organizationName;
          if (businessNumber !== undefined) application.businessNumber = businessNumber ? normalizeBusinessNumber(businessNumber) : undefined;
          if (serviceTypes !== undefined) application.serviceTypes = serviceTypes;
          if (note !== undefined) application.note = note;
          if (requestedSlug !== undefined) application.requestedSlug = requestedSlug;
        } else {
          // Create new draft
          application = new GlycopharmApplication();
          application.userId = userId;
          application.organizationType = organizationType || 'pharmacy';
          application.organizationName = organizationName || '';
          application.businessNumber = businessNumber ? normalizeBusinessNumber(businessNumber) : undefined;
          application.serviceTypes = serviceTypes || [];
          application.note = note;
          application.requestedSlug = requestedSlug;
          application.status = 'draft' as any;
          application.submittedAt = new Date();
        }

        await applicationRepo.save(application);

        logger.info(`[StoreApplications] Draft saved: ${application.id} by user ${userId}`);

        res.json({
          success: true,
          data: {
            id: application.id,
            userId: application.userId,
            organizationType: application.organizationType,
            organizationName: application.organizationName,
            businessNumber: application.businessNumber,
            serviceTypes: application.serviceTypes,
            note: application.note,
            requestedSlug: application.requestedSlug,
            status: application.status,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] Save draft error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // POST /store-applications — 신청서 제출
  // ============================================================================
  router.post(
    '/',
    requireAuth,
    body('organizationType').isIn(['pharmacy', 'pharmacy_chain']).withMessage('Invalid organization type'),
    body('organizationName').notEmpty().isString().isLength({ max: 255 }).withMessage('Organization name is required'),
    body('businessNumber').optional().isString().isLength({ max: 100 }),
    body('serviceTypes').isArray({ min: 1 }).withMessage('At least one service type is required'),
    body('serviceTypes.*').isIn(['dropshipping', 'sample_sales', 'digital_signage']).withMessage('Invalid service type'),
    body('note').optional().isString().isLength({ max: 2000 }),
    body('requestedSlug').optional().isString().isLength({ min: 3, max: 120 }),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const { organizationType, organizationName, businessNumber, serviceTypes, note, requestedSlug } = req.body;
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

        // Validate slug if provided
        let validatedSlug: string | undefined;
        if (requestedSlug) {
          const normalized = normalizeSlug(requestedSlug);
          const slugService = new StoreSlugService(dataSource);
          const availability = await slugService.checkAvailability(normalized);
          if (!availability.available) {
            res.status(400).json({ success: false, error: { code: 'SLUG_NOT_AVAILABLE', message: `Slug '${requestedSlug}' is not available`, reason: availability.reason } });
            return;
          }
          validatedSlug = normalized;
        }

        // Check for pending/submitted application
        const pendingApplication = await applicationRepo.findOne({
          where: { userId, status: 'submitted' },
        });
        if (pendingApplication) {
          res.status(409).json({ success: false, error: { code: 'APPLICATION_PENDING', message: 'You already have a pending application' } });
          return;
        }

        // Check for already approved
        const approvedApplication = await applicationRepo.findOne({
          where: { userId, status: 'approved' },
        });
        if (approvedApplication) {
          res.status(409).json({ success: false, error: { code: 'ALREADY_APPROVED', message: 'You already have an approved pharmacy registration' } });
          return;
        }

        // Check for existing draft → convert to submitted
        let application = await applicationRepo.findOne({
          where: { userId, status: 'draft' as any },
        });

        if (application) {
          application.organizationType = organizationType;
          application.organizationName = organizationName;
          application.businessNumber = businessNumber ? normalizeBusinessNumber(businessNumber) : undefined;
          application.serviceTypes = serviceTypes;
          application.note = note;
          application.requestedSlug = validatedSlug;
          application.status = 'submitted';
          application.submittedAt = new Date();
        } else {
          application = new GlycopharmApplication();
          application.userId = userId;
          application.organizationType = organizationType;
          application.organizationName = organizationName;
          application.businessNumber = businessNumber ? normalizeBusinessNumber(businessNumber) : undefined;
          application.serviceTypes = serviceTypes;
          application.note = note;
          application.requestedSlug = validatedSlug;
          application.status = 'submitted';
          application.submittedAt = new Date();
        }

        await applicationRepo.save(application);
        logger.info(`[StoreApplications] Application submitted: ${application.id} by user ${userId}`);

        // Send notification emails (fire-and-forget)
        try {
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: userId } });
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const applicantEmail = appUser?.email || '';
          const appliedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          const operatorEmail = await OperatorNotificationController.getOperatorEmail('glycopharm');
          if (operatorEmail && emailService.isServiceAvailable()) {
            const isEnabled = await OperatorNotificationController.isNotificationEnabled('glycopharm', 'serviceApplication');
            if (isEnabled) {
              await emailService.sendServiceApplicationOperatorNotificationEmail(
                operatorEmail.primary,
                {
                  serviceName: 'GlycoPharm',
                  applicantName,
                  applicantEmail,
                  applicantPhone: appUser?.phone,
                  appliedAt,
                  businessName: application.organizationName,
                  businessNumber: application.businessNumber || undefined,
                  note: application.note || undefined,
                  reviewUrl: `${process.env.OPERATOR_URL || 'https://glycopharm.co.kr'}/operator/store-approvals`,
                },
              );
            }
          }

          if (applicantEmail && emailService.isServiceAvailable()) {
            await emailService.sendServiceApplicationSubmittedEmail(applicantEmail, {
              serviceName: 'GlycoPharm',
              applicantName,
              applicantEmail,
              appliedAt,
              supportEmail: 'support@glycopharm.co.kr',
            });
          }
        } catch (emailError) {
          logger.error('[StoreApplications] Failed to send notification emails:', emailError);
        }

        res.status(201).json({
          success: true,
          data: {
            id: application.id,
            organizationType: application.organizationType,
            organizationName: application.organizationName,
            serviceTypes: application.serviceTypes,
            status: application.status,
            submittedAt: application.submittedAt,
            createdAt: application.createdAt,
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] Submit error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // GET /store-applications — 목록 조회 (operator/admin)
  // ============================================================================
  router.get(
    '/',
    requireAuth,
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userRoles = user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' } });
          return;
        }

        const { status } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const offset = (page - 1) * pageSize;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const userRepo = dataSource.getRepository(User);

        const queryBuilder = applicationRepo
          .createQueryBuilder('app')
          .orderBy('app.submittedAt', 'DESC')
          .skip(offset)
          .take(pageSize);

        if (status) {
          queryBuilder.andWhere('app.status = :status', { status });
        }

        const [applications, total] = await queryBuilder.getManyAndCount();

        // Fetch user info
        const userIds = [...new Set(applications.map((app) => app.userId))];
        const users = userIds.length > 0
          ? await dataSource.query(
              `SELECT u.id, u.name, u.email, u.phone FROM users u
               JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'glycopharm'
               WHERE u.id = ANY($1)`,
              [userIds],
            )
          : [];
        const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

        res.json({
          success: true,
          data: {
            items: applications.map((app) => {
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
                requestedSlug: app.requestedSlug,
                status: app.status,
                rejectionReason: app.rejectionReason,
                submittedAt: app.submittedAt,
                decidedAt: app.decidedAt,
                decidedBy: app.decidedBy,
                metadata: app.metadata,
                createdAt: app.createdAt,
              };
            }),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] List error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // GET /store-applications/:id — 상세 조회
  // ============================================================================
  router.get(
    '/:id',
    requireAuth,
    param('id').isUUID(),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const { id } = req.params;
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const userRepo = dataSource.getRepository(User);
        const orgRepo = dataSource.getRepository(OrganizationStore);
        const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);

        const application = await applicationRepo.findOne({ where: { id } });

        if (!application) {
          res.status(404).json({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } });
          return;
        }

        // Owner or operator/admin can access
        if (application.userId !== userId && !isOperatorOrAdmin(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
          return;
        }

        // Get user info
        const appUser = await userRepo.findOne({ where: { id: application.userId } });

        // Get pharmacy if exists
        const pharmacy = await orgRepo.findOne({ where: { created_by_user_id: application.userId } });
        const extension = pharmacy
          ? await extRepo.findOne({ where: { organization_id: pharmacy.id } })
          : null;

        res.json({
          success: true,
          data: {
            id: application.id,
            userId: application.userId,
            userName: appUser?.name || null,
            userEmail: appUser?.email || null,
            userPhone: (appUser as any)?.phone || null,
            organizationType: application.organizationType,
            organizationName: application.organizationName,
            businessNumber: application.businessNumber,
            serviceTypes: application.serviceTypes,
            note: application.note,
            requestedSlug: application.requestedSlug,
            status: application.status,
            rejectionReason: application.rejectionReason,
            submittedAt: application.submittedAt,
            decidedAt: application.decidedAt,
            decidedBy: application.decidedBy,
            metadata: application.metadata,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
            pharmacy: pharmacy
              ? {
                  id: pharmacy.id,
                  name: pharmacy.name,
                  code: pharmacy.code,
                  address: pharmacy.address,
                  phone: pharmacy.phone,
                  ownerName: extension?.owner_name || null,
                  businessNumber: pharmacy.business_number,
                  status: pharmacy.isActive ? 'active' : 'inactive',
                  createdAt: pharmacy.createdAt,
                }
              : null,
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] Detail error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // POST /store-applications/:id/approve — 승인 (operator/admin)
  // ============================================================================
  router.post(
    '/:id/approve',
    requireAuth,
    param('id').isUUID(),
    body('storeSlug').optional().isString().isLength({ min: 3, max: 120 }),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' } });
          return;
        }

        const { id } = req.params;
        const { storeSlug: adminSlug } = req.body;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const orgRepo = dataSource.getRepository(OrganizationStore);
        const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);

        const application = await applicationRepo.findOne({ where: { id } });

        if (!application) {
          res.status(404).json({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } });
          return;
        }

        // Only submitted or supplementing can be approved
        if (application.status !== 'submitted' && application.status !== 'supplementing') {
          // Allow re-approval if approved but org creation failed
          if (application.status === 'approved') {
            const existingOrg = await orgRepo.findOne({ where: { created_by_user_id: application.userId } });
            if (existingOrg) {
              res.status(409).json({ success: false, error: { code: 'ALREADY_DECIDED', message: `Application already ${application.status}` } });
              return;
            }
            logger.info(`[StoreApplications] Re-processing approved application ${id} (org not created)`);
          } else {
            res.status(409).json({ success: false, error: { code: 'ALREADY_DECIDED', message: `Application already ${application.status}` } });
            return;
          }
        }

        // Update application status
        if (application.status !== 'approved') {
          application.status = 'approved';
          application.decidedAt = new Date();
          application.decidedBy = userId;
          await applicationRepo.save(application);
        }

        // Create pharmacy (organization + extension + enrollment) — transaction
        let createdOrg: OrganizationStore | null = null;
        const existingOrg = await orgRepo.findOne({ where: { created_by_user_id: application.userId } });

        if (!existingOrg) {
          const queryRunner = dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();

          try {
            const pharmacyCode = generatePharmacyCode();
            const slugService = new StoreSlugService(queryRunner.manager);

            // Slug priority: admin override > requestedSlug > auto-generate
            let slugValue: string;
            const slugSource = adminSlug || application.requestedSlug;
            if (slugSource) {
              const normalized = normalizeSlug(slugSource);
              const availability = await slugService.checkAvailability(normalized);
              if (!availability.available) {
                throw new Error(`Slug '${slugSource}' is not available: ${availability.reason}`);
              }
              slugValue = normalized;
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

            // Register slug
            await slugService.reserveSlug({
              storeId: createdOrg.id,
              serviceKey: 'glycopharm',
              slug: slugValue,
            });

            await queryRunner.commitTransaction();
            logger.info(`[StoreApplications] Pharmacy created: ${createdOrg.id} for user ${application.userId}`);
          } catch (txError) {
            await queryRunner.rollbackTransaction();
            throw txError;
          } finally {
            await queryRunner.release();
          }
        } else {
          // Pharmacy already exists - merge new services
          createdOrg = existingOrg;
          const existingExt = await extRepo.findOne({ where: { organization_id: existingOrg.id } });
          const currentServices = existingExt?.enabled_services || [];
          const newServices = application.serviceTypes.filter(
            (s: string) => !currentServices.includes(s as any),
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
          }
        }

        // organization_members ownership
        if (createdOrg) {
          await dataSource.query(
            `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
             VALUES (uuid_generate_v4(), $1, $2, 'owner', false, NOW(), NOW(), NOW())
             ON CONFLICT (organization_id, user_id) DO NOTHING`,
            [createdOrg.id, application.userId],
          );

          // Auto-list public products
          autoListPublicProductsForOrg(dataSource, createdOrg.id, 'glycopharm')
            .then((count) => logger.info(`[StoreApplications] Auto-listed ${count} PUBLIC products for org ${createdOrg!.id}`))
            .catch((err) => logger.error('[StoreApplications] Auto-listing failed:', err));
        }

        logger.info(`[StoreApplications] Application ${id} approved by ${userId}`);

        res.json({
          success: true,
          data: {
            id: application.id,
            status: application.status,
            decidedAt: application.decidedAt,
            decidedBy: application.decidedBy,
            pharmacy: createdOrg
              ? {
                  id: createdOrg.id,
                  name: createdOrg.name,
                  code: createdOrg.code,
                  status: createdOrg.isActive ? 'active' : 'inactive',
                }
              : null,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[StoreApplications] Approve error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: errorMessage } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // POST /store-applications/:id/reject — 거절 (operator/admin)
  // ============================================================================
  router.post(
    '/:id/reject',
    requireAuth,
    param('id').isUUID(),
    body('reason').notEmpty().isString().isLength({ max: 2000 }).withMessage('Rejection reason is required'),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' } });
          return;
        }

        const { id } = req.params;
        const { reason } = req.body;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const application = await applicationRepo.findOne({ where: { id } });

        if (!application) {
          res.status(404).json({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } });
          return;
        }

        if (application.status !== 'submitted' && application.status !== 'supplementing') {
          res.status(409).json({ success: false, error: { code: 'ALREADY_DECIDED', message: `Application already ${application.status}` } });
          return;
        }

        application.status = 'rejected';
        application.rejectionReason = reason;
        application.decidedAt = new Date();
        application.decidedBy = userId;
        await applicationRepo.save(application);

        logger.info(`[StoreApplications] Application ${id} rejected by ${userId}`);

        res.json({
          success: true,
          data: {
            id: application.id,
            status: application.status,
            rejectionReason: application.rejectionReason,
            decidedAt: application.decidedAt,
            decidedBy: application.decidedBy,
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] Reject error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  // ============================================================================
  // POST /store-applications/:id/supplement — 보완 요청 (operator/admin)
  // ============================================================================
  router.post(
    '/:id/supplement',
    requireAuth,
    param('id').isUUID(),
    body('request').notEmpty().isString().isLength({ max: 2000 }).withMessage('Supplement request message is required'),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' } });
          return;
        }

        const { id } = req.params;
        const { request: supplementRequest } = req.body;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const application = await applicationRepo.findOne({ where: { id } });

        if (!application) {
          res.status(404).json({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } });
          return;
        }

        if (application.status !== 'submitted') {
          res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot request supplement for application with status '${application.status}'` } });
          return;
        }

        application.status = 'supplementing' as any;
        application.metadata = {
          ...application.metadata,
          supplementRequests: [
            ...(application.metadata?.supplementRequests || []),
            {
              requestedBy: userId,
              requestedAt: new Date().toISOString(),
              message: supplementRequest,
            },
          ],
        };
        await applicationRepo.save(application);

        logger.info(`[StoreApplications] Supplement requested for application ${id} by ${userId}`);

        res.json({
          success: true,
          data: {
            id: application.id,
            status: application.status,
            metadata: application.metadata,
          },
        });
      } catch (error) {
        logger.error('[StoreApplications] Supplement request error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
      }
    }) as unknown as RequestHandler,
  );

  return router;
}
