/**
 * GlucoseView Application Controller
 *
 * Phase C-4: GlucoseView Application Workflow
 * Handles CGM View service applications
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { GlucoseViewApplication } from '../entities/glucoseview-application.entity.js';
import { GlucoseViewPharmacy } from '../entities/glucoseview-pharmacy.entity.js';
import { User } from '../../../modules/auth/entities/User.js';
import logger from '../../../utils/logger.js';
import { emailService } from '../../../services/email.service.js';
import { OperatorNotificationController } from '../../../controllers/OperatorNotificationController.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../../utils/role.utils.js';

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
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.3: GlucoseView)
 * - **GlucoseView 비즈니스 서비스는 glucoseview:* role + platform:admin 신뢰**
 * - Priority 1: GlucoseView prefixed roles + platform admin (platform:admin, platform:super_admin)
 * - Priority 2: Legacy role detection → Log + DENY
 * - Cross-service isolation: Other service roles DENY
 */
function isOperatorOrAdmin(roles: string[] = [], userId: string = 'unknown'): boolean {
  // Priority 1: Check GlucoseView-specific prefixed roles + platform admin
  const hasGlucoseViewRole = hasAnyServiceRole(roles, [
    'glucoseview:admin',
    'glucoseview:operator',
    'platform:admin',
    'platform:super_admin'
  ]);

  if (hasGlucoseViewRole) {
    return true;
  }

  // Priority 2: Detect legacy roles and DENY access
  const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
  const detectedLegacyRoles = roles.filter(r => legacyRoles.includes(r));

  if (detectedLegacyRoles.length > 0) {
    // Log legacy role usage and deny access
    detectedLegacyRoles.forEach(role => {
      logLegacyRoleUsage(userId, role, 'application.controller:isOperatorOrAdmin');
    });
    return false; // ❌ DENY - Legacy roles no longer grant access
  }

  // Detect other service roles and deny
  const hasOtherServiceRole = roles.some(r =>
    r.startsWith('kpa:') ||
    r.startsWith('neture:') ||
    r.startsWith('glycopharm:') ||
    r.startsWith('cosmetics:')
  );

  if (hasOtherServiceRole) {
    // Other service admins do NOT have GlucoseView access
    return false; // ❌ DENY - GlucoseView requires glucoseview:* or platform:* roles
  }

  return false;
}

/**
 * Create Application Controller
 */
export function createGlucoseViewApplicationController(
  dataSource: DataSource,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  /**
   * POST /api/v1/glucoseview/applications
   * Submit a new CGM View application
   */
  router.post(
    '/',
    requireAuth,
    body('pharmacyName').notEmpty().isString().isLength({ max: 255 }).withMessage('Pharmacy name is required'),
    body('businessNumber').optional().isString().isLength({ max: 100 }),
    body('pharmacyId').optional().isUUID(),
    body('note').optional().isString().isLength({ max: 2000 }),
    (async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        const { pharmacyName, businessNumber, pharmacyId, note } = req.body;

        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);

        // Check if there's already a pending application
        const pendingApplication = await applicationRepo.findOne({
          where: { userId, status: 'submitted' },
        });

        if (pendingApplication) {
          res.status(409).json({
            error: 'Application already pending',
            code: 'APPLICATION_PENDING',
            application: {
              id: pendingApplication.id,
              status: pendingApplication.status,
              submittedAt: pendingApplication.submittedAt,
            },
          });
          return;
        }

        // Check if user already has an approved application
        const approvedApplication = await applicationRepo.findOne({
          where: { userId, status: 'approved' },
        });

        if (approvedApplication) {
          res.status(409).json({
            error: 'Already approved',
            code: 'ALREADY_APPROVED',
            message: 'You already have an approved GlucoseView registration',
          });
          return;
        }

        // Create new application
        const application = new GlucoseViewApplication();
        application.userId = userId;
        application.pharmacyName = pharmacyName;
        application.businessNumber = businessNumber;
        application.pharmacyId = pharmacyId;
        application.serviceTypes = ['cgm_view'];
        application.note = note;
        application.status = 'submitted';
        application.submittedAt = new Date();

        await applicationRepo.save(application);

        logger.info(`[GlucoseView] New application submitted: ${application.id} by user ${userId}`);

        // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send notification emails
        try {
          // Get user info for email
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: userId } });
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const applicantEmail = appUser?.email || '';
          const appliedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          // 1. Send notification to operator
          const operatorEmail = await OperatorNotificationController.getOperatorEmail('glucoseview');
          if (operatorEmail && emailService.isServiceAvailable()) {
            const isEnabled = await OperatorNotificationController.isNotificationEnabled('glucoseview', 'serviceApplication');
            if (isEnabled) {
              await emailService.sendServiceApplicationOperatorNotificationEmail(
                operatorEmail.primary,
                {
                  serviceName: 'GlucoseView',
                  applicantName,
                  applicantEmail,
                  applicantPhone: appUser?.phone,
                  appliedAt,
                  pharmacyName: application.pharmacyName,
                  businessNumber: application.businessNumber || undefined,
                  note: application.note || undefined,
                  reviewUrl: `${process.env.OPERATOR_URL || 'https://glucoseview.co.kr'}/operator/glucoseview/applications/${application.id}`,
                }
              );
              logger.info(`[GlucoseView] Operator notification sent to ${operatorEmail.primary}`);

              // Update last notification time
              await OperatorNotificationController.updateLastNotificationTime('glucoseview');
            }
          }

          // 2. Send confirmation to applicant
          if (applicantEmail && emailService.isServiceAvailable()) {
            await emailService.sendServiceApplicationSubmittedEmail(
              applicantEmail,
              {
                serviceName: 'GlucoseView',
                applicantName,
                applicantEmail,
                appliedAt,
                supportEmail: 'support@glucoseview.co.kr',
              }
            );
            logger.info(`[GlucoseView] Application confirmation sent to ${applicantEmail}`);
          }
        } catch (emailError) {
          // Don't fail the application submission if email fails
          logger.error('[GlucoseView] Failed to send notification emails:', emailError);
        }

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          application: {
            id: application.id,
            pharmacyName: application.pharmacyName,
            serviceTypes: application.serviceTypes,
            status: application.status,
            submittedAt: application.submittedAt,
          },
        });
      } catch (error) {
        logger.error('[GlucoseView] Application submission error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glucoseview/applications/mine
   * Get current user's applications
   */
  router.get(
    '/mine',
    requireAuth,
    query('status').optional().isIn(['submitted', 'approved', 'rejected']),
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        const { status } = req.query;

        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);

        const where: any = { userId };
        if (status) {
          where.status = status;
        }

        const applications = await applicationRepo.find({
          where,
          order: { submittedAt: 'DESC' },
        });

        res.json({
          success: true,
          applications: applications.map((app) => ({
            id: app.id,
            pharmacyName: app.pharmacyName,
            businessNumber: app.businessNumber,
            pharmacyId: app.pharmacyId,
            serviceTypes: app.serviceTypes,
            note: app.note,
            status: app.status,
            rejectionReason: app.rejectionReason,
            submittedAt: app.submittedAt,
            decidedAt: app.decidedAt,
          })),
        });
      } catch (error) {
        logger.error('[GlucoseView] Get my applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glucoseview/applications/:id
   * Get application by ID
   */
  router.get(
    '/:id',
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
        const userId = user?.userId || user?.id;
        const userRoles = user?.roles || [];

        if (!userId) {
          res.status(401).json({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        const { id } = req.params;
        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);

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

        // Only allow access if owner or admin
        const isAdmin = isOperatorOrAdmin(userRoles, userId);
        if (application.userId !== userId && !isAdmin) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
          });
          return;
        }

        res.json({
          success: true,
          application: {
            id: application.id,
            pharmacyName: application.pharmacyName,
            businessNumber: application.businessNumber,
            pharmacyId: application.pharmacyId,
            serviceTypes: application.serviceTypes,
            note: application.note,
            status: application.status,
            rejectionReason: application.rejectionReason,
            submittedAt: application.submittedAt,
            decidedAt: application.decidedAt,
          },
        });
      } catch (error) {
        logger.error('[GlucoseView] Get application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glucoseview/applications/admin/all
   * Get all applications (operator/admin only)
   */
  router.get(
    '/admin/all',
    requireAuth,
    query('status').optional().isIn(['submitted', 'approved', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id || 'unknown';
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles, userId)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const { status } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);
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
              pharmacyName: app.pharmacyName,
              businessNumber: app.businessNumber,
              pharmacyId: app.pharmacyId,
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
        logger.error('[GlucoseView Admin] Get all applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * PATCH /api/v1/glucoseview/applications/:id/review
   * Approve or reject an application (operator/admin only)
   */
  router.patch(
    '/:id/review',
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
        const userId = user?.userId || user?.id || 'unknown';
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles, userId)) {
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

        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);
        const pharmacyRepo = dataSource.getRepository(GlucoseViewPharmacy);

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

        // If approved, create GlucoseView pharmacy
        let pharmacy: GlucoseViewPharmacy | null = null;
        if (status === 'approved') {
          // Check if pharmacy already exists for this user
          const existingPharmacy = await pharmacyRepo.findOne({
            where: { userId: application.userId },
          });

          if (!existingPharmacy) {
            // Create new pharmacy with enabled services
            pharmacy = new GlucoseViewPharmacy();
            pharmacy.userId = application.userId;
            pharmacy.name = application.pharmacyName;
            pharmacy.businessNumber = application.businessNumber;
            pharmacy.glycopharmPharmacyId = application.pharmacyId;
            pharmacy.status = 'active';
            pharmacy.enabledServices = ['cgm_view'];

            await pharmacyRepo.save(pharmacy);

            logger.info(
              `[GlucoseView Admin] Pharmacy created: ${pharmacy.id} for user ${application.userId}`
            );
          } else {
            // Pharmacy already exists - merge new services
            pharmacy = existingPharmacy;
            const currentServices = pharmacy.enabledServices || [];
            const newServices = application.serviceTypes.filter(
              (s) => !currentServices.includes(s)
            );

            if (newServices.length > 0) {
              pharmacy.enabledServices = [...currentServices, ...newServices];
              await pharmacyRepo.save(pharmacy);
              logger.info(
                `[GlucoseView Admin] Pharmacy ${existingPharmacy.id} updated with new services: ${newServices.join(', ')}`
              );
            } else {
              logger.info(
                `[GlucoseView Admin] Pharmacy already exists: ${existingPharmacy.id} for user ${application.userId}`
              );
            }
          }
        }

        logger.info(
          `[GlucoseView Admin] Application ${id} ${status} by ${userId}`
        );

        // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send result notification to applicant
        try {
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: application.userId } });
          const applicantEmail = appUser?.email;
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          if (applicantEmail && emailService.isServiceAvailable()) {
            if (status === 'approved') {
              await emailService.sendServiceApplicationApprovedEmail(
                applicantEmail,
                {
                  serviceName: 'GlucoseView',
                  applicantName,
                  approvedAt: decidedAt,
                  serviceUrl: process.env.GLUCOSEVIEW_URL || 'https://glucoseview.co.kr',
                  supportEmail: 'support@glucoseview.co.kr',
                }
              );
              logger.info(`[GlucoseView Admin] Approval notification sent to ${applicantEmail}`);
            } else if (status === 'rejected') {
              await emailService.sendServiceApplicationRejectedEmail(
                applicantEmail,
                {
                  serviceName: 'GlucoseView',
                  applicantName,
                  rejectedAt: decidedAt,
                  rejectionReason: application.rejectionReason || undefined,
                  supportEmail: 'support@glucoseview.co.kr',
                }
              );
              logger.info(`[GlucoseView Admin] Rejection notification sent to ${applicantEmail}`);
            }
          }
        } catch (emailError) {
          // Don't fail the review if email fails
          logger.error('[GlucoseView Admin] Failed to send result notification email:', emailError);
        }

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
                status: pharmacy.status,
                enabledServices: pharmacy.enabledServices,
              }
            : null,
        });
      } catch (error) {
        logger.error('[GlucoseView Admin] Review application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glucoseview/applications/:id/admin
   * Get application detail for admin (operator/admin only)
   */
  router.get(
    '/:id/admin',
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
        const userId = user?.userId || user?.id || 'unknown';
        const userRoles = user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles, userId)) {
          res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Operator or administrator role required',
          });
          return;
        }

        const { id } = req.params;

        const applicationRepo = dataSource.getRepository(GlucoseViewApplication);
        const userRepo = dataSource.getRepository(User);
        const pharmacyRepo = dataSource.getRepository(GlucoseViewPharmacy);

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
          where: { userId: application.userId },
        });

        res.json({
          success: true,
          application: {
            id: application.id,
            userId: application.userId,
            userName: appUser?.name || null,
            userEmail: appUser?.email || null,
            userPhone: appUser?.phone || null,
            pharmacyName: application.pharmacyName,
            businessNumber: application.businessNumber,
            pharmacyId: application.pharmacyId,
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
                businessNumber: pharmacy.businessNumber,
                status: pharmacy.status,
                enabledServices: pharmacy.enabledServices,
                createdAt: pharmacy.createdAt,
              }
            : null,
        });
      } catch (error) {
        logger.error('[GlucoseView Admin] Get application detail error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
