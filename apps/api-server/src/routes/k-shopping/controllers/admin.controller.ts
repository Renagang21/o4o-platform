/**
 * K-Shopping Admin Controller
 *
 * K-Shopping (여행자 서비스) 관리자/운영자 엔드포인트
 * - GET /applications/admin/all - 전체 신청 목록
 * - GET /applications/:id/admin - 신청 상세 (관리자용)
 * - PATCH /applications/:id/review - 승인/반려 처리
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { KShoppingApplication } from '../entities/kshopping-application.entity.js';
import { KShoppingParticipant } from '../entities/kshopping-participant.entity.js';
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
 * Generate unique participant code
 */
function generateParticipantCode(participantType: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = participantType === 'store' ? 'KS' : participantType === 'guide' ? 'KG' : 'KP';
  return `${prefix}-${timestamp}-${random}`;
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
   * GET /api/v1/k-shopping/applications/admin/all
   * Get all applications (operator/admin only)
   */
  router.get(
    '/applications/admin/all',
    requireAuth,
    query('status').optional().isIn(['submitted', 'approved', 'rejected']),
    query('serviceType').optional().isIn(['tax_refund', 'guide_sales', 'travel_package']),
    query('participantType').optional().isIn(['store', 'guide', 'partner']),
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

        const { status, serviceType, participantType } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const applicationRepo = dataSource.getRepository(KShoppingApplication);
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

        if (participantType) {
          queryBuilder.andWhere('app.participantType = :participantType', { participantType });
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
              participantType: app.participantType,
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
        logger.error('[K-Shopping Admin] Get all applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * PATCH /api/v1/k-shopping/applications/:id/review
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

        const applicationRepo = dataSource.getRepository(KShoppingApplication);
        const participantRepo = dataSource.getRepository(KShoppingParticipant);

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

        // If approved, create participant
        let participant: KShoppingParticipant | null = null;
        if (status === 'approved') {
          // Check if participant already exists for this user
          const existingParticipant = await participantRepo.findOne({
            where: { userId: application.userId },
          });

          if (!existingParticipant) {
            // Create new participant with enabled services from application
            participant = new KShoppingParticipant();
            participant.userId = application.userId;
            participant.participantType = application.participantType;
            participant.organizationName = application.organizationName;
            participant.code = generateParticipantCode(application.participantType);
            participant.businessNumber = application.businessNumber;
            participant.status = 'active';
            participant.enabledServices = application.serviceTypes;
            participant.applicationId = application.id;

            await participantRepo.save(participant);

            logger.info(
              `[K-Shopping Admin] Participant created: ${participant.id} for user ${application.userId}`
            );
          } else {
            // Participant already exists - merge new services with existing
            participant = existingParticipant;
            const currentServices = participant.enabledServices || [];
            const newServices = application.serviceTypes.filter(
              (s) => !currentServices.includes(s)
            );

            if (newServices.length > 0) {
              participant.enabledServices = [...currentServices, ...newServices];
              await participantRepo.save(participant);
              logger.info(
                `[K-Shopping Admin] Participant ${existingParticipant.id} updated with new services: ${newServices.join(', ')}`
              );
            } else {
              logger.info(
                `[K-Shopping Admin] Participant already exists: ${existingParticipant.id} for user ${application.userId}`
              );
            }
          }
        }

        logger.info(
          `[K-Shopping Admin] Application ${id} ${status} by ${userId}`
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
          participant: participant
            ? {
                id: participant.id,
                organizationName: participant.organizationName,
                code: participant.code,
                status: participant.status,
                enabledServices: participant.enabledServices,
              }
            : null,
        });
      } catch (error) {
        logger.error('[K-Shopping Admin] Review application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/k-shopping/applications/:id/admin
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

        const applicationRepo = dataSource.getRepository(KShoppingApplication);
        const userRepo = dataSource.getRepository(User);
        const participantRepo = dataSource.getRepository(KShoppingParticipant);

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

        // Get participant if exists
        const participant = await participantRepo.findOne({
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
            participantType: application.participantType,
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
          participant: participant
            ? {
                id: participant.id,
                organizationName: participant.organizationName,
                code: participant.code,
                address: participant.address,
                phone: participant.phone,
                email: participant.email,
                contactName: participant.contactName,
                businessNumber: participant.businessNumber,
                status: participant.status,
                enabledServices: participant.enabledServices,
                createdAt: participant.createdAt,
              }
            : null,
        });
      } catch (error) {
        logger.error('[K-Shopping Admin] Get application detail error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
