/**
 * K-Shopping Application Controller
 *
 * K-Shopping (여행자 서비스) 신청 관련 엔드포인트
 * - POST /applications - 신청 제출
 * - GET /applications/mine - 내 신청 목록
 * - GET /applications/:id - 신청 상세
 * - GET /participants/me - 내 참여자 정보 (Dashboard)
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
 * Create Application Controller
 */
export function createApplicationController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  _requireScope: (scope: string) => RequestHandler
): Router {
  const router = Router();

  /**
   * POST /api/v1/k-shopping/applications
   * Submit a new application
   */
  router.post(
    '/applications',
    requireAuth,
    body('participantType').isIn(['store', 'guide', 'partner']).withMessage('Invalid participant type'),
    body('organizationName').notEmpty().isString().isLength({ max: 255 }).withMessage('Organization name is required'),
    body('businessNumber').optional().isString().isLength({ max: 100 }),
    body('serviceTypes').isArray({ min: 1 }).withMessage('At least one service type is required'),
    body('serviceTypes.*').isIn(['tax_refund', 'guide_sales', 'travel_package']).withMessage('Invalid service type'),
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

        const { participantType, organizationName, businessNumber, serviceTypes, note } = req.body;

        const applicationRepo = dataSource.getRepository(KShoppingApplication);

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
            message: 'You already have an approved K-Shopping registration',
          });
          return;
        }

        // Create new application
        const application = new KShoppingApplication();
        application.userId = userId;
        application.participantType = participantType;
        application.organizationName = organizationName;
        application.businessNumber = businessNumber;
        application.serviceTypes = serviceTypes;
        application.note = note;
        application.status = 'submitted';
        application.submittedAt = new Date();

        await applicationRepo.save(application);

        logger.info(`[K-Shopping] New application submitted: ${application.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          application: {
            id: application.id,
            participantType: application.participantType,
            organizationName: application.organizationName,
            serviceTypes: application.serviceTypes,
            status: application.status,
            submittedAt: application.submittedAt,
          },
        });
      } catch (error) {
        logger.error('[K-Shopping] Application submission error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/k-shopping/applications/mine
   * Get current user's applications
   */
  router.get(
    '/applications/mine',
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

        const applicationRepo = dataSource.getRepository(KShoppingApplication);

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
            participantType: app.participantType,
            organizationName: app.organizationName,
            businessNumber: app.businessNumber,
            serviceTypes: app.serviceTypes,
            note: app.note,
            status: app.status,
            rejectionReason: app.rejectionReason,
            submittedAt: app.submittedAt,
            decidedAt: app.decidedAt,
          })),
        });
      } catch (error) {
        logger.error('[K-Shopping] Get my applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/k-shopping/applications/:id
   * Get application by ID
   */
  router.get(
    '/applications/:id',
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
        const applicationRepo = dataSource.getRepository(KShoppingApplication);

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
        const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('operator');
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
            participantType: application.participantType,
            organizationName: application.organizationName,
            businessNumber: application.businessNumber,
            serviceTypes: application.serviceTypes,
            note: application.note,
            status: application.status,
            rejectionReason: application.rejectionReason,
            submittedAt: application.submittedAt,
            decidedAt: application.decidedAt,
          },
        });
      } catch (error) {
        logger.error('[K-Shopping] Get application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/k-shopping/participants/me
   * Get current user's participant info (Dashboard)
   */
  router.get(
    '/participants/me',
    requireAuth,
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

        const participantRepo = dataSource.getRepository(KShoppingParticipant);

        // Find participant by user ID
        const participant = await participantRepo.findOne({
          where: { userId },
        });

        if (!participant) {
          // Check if there's an approved application but no participant yet
          const applicationRepo = dataSource.getRepository(KShoppingApplication);
          const approvedApp = await applicationRepo.findOne({
            where: { userId, status: 'approved' },
          });

          if (approvedApp) {
            res.json({
              success: true,
              participant: null,
              application: {
                id: approvedApp.id,
                status: approvedApp.status,
                organizationName: approvedApp.organizationName,
                serviceTypes: approvedApp.serviceTypes,
                decidedAt: approvedApp.decidedAt,
              },
              message: 'Application approved, participant setup pending',
            });
            return;
          }

          res.status(404).json({
            error: 'Not found',
            code: 'PARTICIPANT_NOT_FOUND',
            message: 'No K-Shopping participant associated with your account',
          });
          return;
        }

        res.json({
          success: true,
          participant: {
            id: participant.id,
            participantType: participant.participantType,
            organizationName: participant.organizationName,
            code: participant.code,
            address: participant.address,
            phone: participant.phone,
            email: participant.email,
            contactName: participant.contactName,
            businessNumber: participant.businessNumber,
            status: participant.status,
            enabledServices: participant.enabledServices || [],
            createdAt: participant.createdAt,
          },
        });
      } catch (error) {
        logger.error('[K-Shopping] Get my participant error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
