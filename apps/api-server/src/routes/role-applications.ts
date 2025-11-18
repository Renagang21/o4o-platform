/**
 * P3: Role Applications Routes (User-facing)
 *
 * Endpoints for users to apply for roles (seller, supplier, partner, etc.)
 * P4: Added email notifications for application submissions
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AppDataSource } from '../database/connection.js';
import { RoleApplication, RoleApplicationStatus } from '../entities/RoleApplication.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { User } from '../entities/User.js';
import { authenticateCookie, AuthRequest } from '../middleware/auth.js';
import { emailService } from '../services/email.service.js';
import { notificationService } from '../services/NotificationService.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// Role display names for emails
const roleNames: Record<string, string> = {
  seller: 'Seller',
  supplier: 'Supplier',
  partner: 'Partner',
  admin: 'Administrator'
};

/**
 * POST /api/v2/roles/apply
 * Submit a new role application
 */
router.post('/apply',
  authenticateCookie,
  body('role').isIn(['seller', 'supplier', 'partner', 'admin']).withMessage('Invalid role'),
  body('businessName').optional().isString().isLength({ max: 100 }),
  body('businessNumber').optional().isString().isLength({ max: 100 }),
  body('note').optional().isString().isLength({ max: 1000 }),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        });
      }

      const { role, businessName, businessNumber, note } = req.body;

      const applicationRepo = AppDataSource.getRepository(RoleApplication);
      const assignmentRepo = AppDataSource.getRepository(RoleAssignment);

      // Check if user already has an approved assignment for this role
      const existingAssignment = await assignmentRepo.findOne({
        where: { userId, role, isActive: true }
      });

      if (existingAssignment) {
        return res.status(409).json({
          error: 'Role already granted',
          code: 'ROLE_ALREADY_GRANTED',
          message: `You already have the ${role} role`
        });
      }

      // Check if there's already a pending application
      const pendingApplication = await applicationRepo.findOne({
        where: { userId, role, status: RoleApplicationStatus.PENDING }
      });

      if (pendingApplication) {
        return res.status(409).json({
          error: 'Application already pending',
          code: 'APPLICATION_PENDING',
          application: {
            id: pendingApplication.id,
            role: pendingApplication.role,
            status: pendingApplication.status,
            appliedAt: pendingApplication.appliedAt
          }
        });
      }

      // Create new application
      const application = new RoleApplication();
      application.userId = userId;
      application.role = role;
      application.status = RoleApplicationStatus.PENDING;
      application.businessName = businessName;
      application.businessNumber = businessNumber;
      application.note = note;
      application.appliedAt = new Date();

      await applicationRepo.save(application);

      // P4: Send email notifications (non-blocking)
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });

      if (user) {
        const emailData = {
          userName: user.name || user.email || 'User',
          userEmail: user.email,
          roleName: roleNames[role] || role,
          businessName: businessName || 'N/A',
          businessNumber: businessNumber || 'N/A',
          appliedAt: application.appliedAt.toLocaleString('ko-KR'),
          note
        };

        // Send confirmation email to user (fire and forget)
        emailService.sendRoleApplicationSubmittedEmail(user.email, emailData)
          .then(() => {
            logger.info(`[P4] Role application submitted email sent to ${user.email}`);
          })
          .catch((err) => {
            logger.error('[P4] Failed to send application submitted email to user:', err);
          });

        // Send notification email to admin (fire and forget)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@neture.co.kr';
        emailService.sendRoleApplicationAdminNotificationEmail(adminEmail, emailData)
          .then(() => {
            logger.info(`[P4] Role application admin notification sent to ${adminEmail}`);
          })
          .catch((err) => {
            logger.error('[P4] Failed to send application notification to admin:', err);
          });

        // CI-2.5: Send in-app notification to user for application submission
        const roleDisplayName = roleNames[role] || role;
        notificationService.createNotification({
          userId: userId,
          type: 'role.application_submitted',
          title: '역할 신청이 접수되었습니다',
          message: `${roleDisplayName} 역할 신청이 접수되었습니다. 심사 후 결과를 알려드리겠습니다.`,
          metadata: {
            role: application.role,
            applicationId: application.id,
          },
          channel: 'in_app',
        }).catch(err => logger.error('[CI-2.5] Failed to send role.application_submitted notification:', err));
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          id: application.id,
          role: application.role,
          status: application.status,
          businessName: application.businessName,
          businessNumber: application.businessNumber,
          appliedAt: application.appliedAt
        }
      });
    } catch (error) {
      console.error('[ROLE APPLICATION ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * GET /api/v2/roles/applications/my
 * Get current user's role applications
 */
router.get('/applications/my',
  authenticateCookie,
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
  async (req: AuthRequest, res) => {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        });
      }

      const { status } = req.query;

      const applicationRepo = AppDataSource.getRepository(RoleApplication);

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const applications = await applicationRepo.find({
        where,
        order: { appliedAt: 'DESC' }
      });

      res.json({
        success: true,
        applications: applications.map(app => ({
          id: app.id,
          role: app.role,
          status: app.status,
          businessName: app.businessName,
          businessNumber: app.businessNumber,
          note: app.note,
          appliedAt: app.appliedAt,
          decidedAt: app.decidedAt,
          decidedBy: app.decidedBy
        }))
      });
    } catch (error) {
      console.error('[GET MY APPLICATIONS ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

export default router;
