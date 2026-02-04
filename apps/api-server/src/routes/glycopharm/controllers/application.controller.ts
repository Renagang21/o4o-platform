/**
 * Glycopharm Application Controller
 *
 * Phase B-1: Glycopharm API Implementation
 * Handles pharmacy participation/service applications
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { body, query, param, validationResult } from 'express-validator';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { User } from '../../../modules/auth/entities/User.js';
import logger from '../../../utils/logger.js';
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
 * Create Application Controller
 */
export function createApplicationController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  _requireScope: (scope: string) => RequestHandler
): Router {
  const router = Router();

  /**
   * POST /api/v1/glycopharm/applications
   * Submit a new application
   */
  router.post(
    '/applications',
    requireAuth,
    body('organizationType').isIn(['pharmacy', 'pharmacy_chain']).withMessage('Invalid organization type'),
    body('organizationName').notEmpty().isString().isLength({ max: 255 }).withMessage('Organization name is required'),
    body('businessNumber').optional().isString().isLength({ max: 100 }),
    body('serviceTypes').isArray({ min: 1 }).withMessage('At least one service type is required'),
    body('serviceTypes.*').isIn(['dropshipping', 'sample_sales', 'digital_signage']).withMessage('Invalid service type'),
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

        const { organizationType, organizationName, businessNumber, serviceTypes, note } = req.body;

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

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
            message: 'You already have an approved pharmacy registration',
          });
          return;
        }

        // Create new application
        const application = new GlycopharmApplication();
        application.userId = userId;
        application.organizationType = organizationType;
        application.organizationName = organizationName;
        application.businessNumber = businessNumber;
        application.serviceTypes = serviceTypes;
        application.note = note;
        application.status = 'submitted';
        application.submittedAt = new Date();

        await applicationRepo.save(application);

        logger.info(`[Glycopharm] New application submitted: ${application.id} by user ${userId}`);

        // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send notification emails
        try {
          // Get user info for email
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: userId } });
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const applicantEmail = appUser?.email || '';
          const appliedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          // 1. Send notification to operator
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
                  reviewUrl: `${process.env.OPERATOR_URL || 'https://glycopharm.co.kr'}/operator/glycopharm/applications/${application.id}`,
                }
              );
              logger.info(`[Glycopharm] Operator notification sent to ${operatorEmail.primary}`);

              await OperatorNotificationController.updateLastNotificationTime('glycopharm');
            }
          }

          // 2. Send confirmation to applicant
          if (applicantEmail && emailService.isServiceAvailable()) {
            await emailService.sendServiceApplicationSubmittedEmail(
              applicantEmail,
              {
                serviceName: 'GlycoPharm',
                applicantName,
                applicantEmail,
                appliedAt,
                supportEmail: 'support@glycopharm.co.kr',
              }
            );
            logger.info(`[Glycopharm] Application confirmation sent to ${applicantEmail}`);
          }
        } catch (emailError) {
          logger.error('[Glycopharm] Failed to send notification emails:', emailError);
        }

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          application: {
            id: application.id,
            organizationType: application.organizationType,
            organizationName: application.organizationName,
            serviceTypes: application.serviceTypes,
            status: application.status,
            submittedAt: application.submittedAt,
          },
        });
      } catch (error) {
        logger.error('[Glycopharm] Application submission error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glycopharm/applications/mine
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

        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

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
            organizationType: app.organizationType,
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
        logger.error('[Glycopharm] Get my applications error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glycopharm/applications/:id
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
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

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
            organizationType: application.organizationType,
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
        logger.error('[Glycopharm] Get application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  /**
   * GET /api/v1/glycopharm/pharmacies/me
   * Get current user's pharmacy info (if approved)
   */
  router.get(
    '/pharmacies/me',
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

        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

        // Find pharmacy created by this user
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          // Check if there's an approved application but no pharmacy yet
          const applicationRepo = dataSource.getRepository(GlycopharmApplication);
          const approvedApp = await applicationRepo.findOne({
            where: { userId, status: 'approved' },
          });

          if (approvedApp) {
            res.json({
              success: true,
              pharmacy: null,
              application: {
                id: approvedApp.id,
                status: approvedApp.status,
                organizationName: approvedApp.organizationName,
                serviceTypes: approvedApp.serviceTypes,
                decidedAt: approvedApp.decidedAt,
              },
              message: 'Application approved, pharmacy setup pending',
            });
            return;
          }

          res.status(404).json({
            error: 'Not found',
            code: 'PHARMACY_NOT_FOUND',
            message: 'No pharmacy associated with your account',
          });
          return;
        }

        res.json({
          success: true,
          pharmacy: {
            id: pharmacy.id,
            name: pharmacy.name,
            code: pharmacy.code,
            address: pharmacy.address,
            phone: pharmacy.phone,
            email: pharmacy.email,
            ownerName: pharmacy.owner_name,
            businessNumber: pharmacy.business_number,
            status: pharmacy.status,
            enabledServices: pharmacy.enabled_services || [],
            createdAt: pharmacy.created_at,
          },
        });
      } catch (error) {
        logger.error('[Glycopharm] Get my pharmacy error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
