/**
 * P3: Admin Role Applications Routes
 *
 * Endpoints for admins to review and approve/reject role applications
 * P4: Added email notifications for approval/rejection
 */

import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { AppDataSource } from '../database/connection.js';
import { RoleApplication, RoleApplicationStatus } from '../entities/RoleApplication.js';
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
import { User } from '../modules/auth/entities/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
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
 * GET /api/v2/admin/roles/metrics/pending
 * Get count of pending role applications (admin only)
 * Phase 2-4: Admin notification widget backend
 */
router.get('/metrics/pending',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const applicationRepo = AppDataSource.getRepository(RoleApplication);

      const pendingCount = await applicationRepo.count({
        where: { status: RoleApplicationStatus.PENDING }
      });

      res.json({
        success: true,
        data: {
          pendingCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[GET METRICS ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * GET /api/v2/admin/roles/applications
 * Get all role applications (admin only)
 */
router.get('/applications',
  requireAuth,
  requireAdmin,
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  async (req: AuthRequest, res) => {
    try {
      const { status = 'pending', page = 1, limit = 50 } = req.query;

      const applicationRepo = AppDataSource.getRepository(RoleApplication);

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [applications, total] = await applicationRepo.findAndCount({
        where,
        order: { appliedAt: 'DESC' },
        skip,
        take: Number(limit),
        relations: ['user']
      });

      res.json({
        success: true,
        applications: applications.map(app => ({
          id: app.id,
          user: {
            id: app.user.id,
            email: app.user.email,
            name: app.user.name,
          },
          role: app.role,
          status: app.status,
          businessName: app.businessName,
          businessNumber: app.businessNumber,
          note: app.note,
          appliedAt: app.appliedAt,
          decidedAt: app.decidedAt,
          decidedBy: app.decidedBy
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('[GET APPLICATIONS ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * POST /api/v2/admin/roles/applications/:id/approve
 * Approve a role application (admin only)
 */
router.post('/applications/:id/approve',
  requireAuth,
  requireAdmin,
  param('id').isUUID(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminUserId = req.user?.id;
      const { id } = req.params;

      const applicationRepo = AppDataSource.getRepository(RoleApplication);
      const assignmentRepo = AppDataSource.getRepository(RoleAssignment);

      const application = await applicationRepo.findOne({
        where: { id },
        relations: ['user']
      });

      if (!application) {
        return res.status(404).json({
          error: 'Application not found',
          code: 'NOT_FOUND'
        });
      }

      if (application.status !== RoleApplicationStatus.PENDING) {
        return res.status(400).json({
          error: 'Application already processed',
          code: 'ALREADY_PROCESSED',
          currentStatus: application.status
        });
      }

      // Start transaction
      await AppDataSource.transaction(async (transactionalEntityManager) => {
        // Create RoleAssignment
        const assignment = new RoleAssignment();
        assignment.userId = application.userId;
        assignment.role = application.role;
        assignment.isActive = true;
        assignment.validFrom = new Date();
        assignment.assignedAt = new Date();
        assignment.assignedBy = adminUserId;

        await transactionalEntityManager.save(RoleAssignment, assignment);

        // Phase 2-5: Sync businessInfo to User entity
        const user = await transactionalEntityManager.findOne(User, {
          where: { id: application.userId }
        });

        if (user) {
          // Map application data to BusinessInfo interface (Korean localized)
          user.businessInfo = {
            businessName: application.businessName || undefined,
            businessNumber: application.businessNumber || undefined,
            businessType: application.role, // Use role as business type (seller/supplier/partner)
            // Additional fields can be added from application.metadata if available
            ...(application.metadata || {})
          };

          await transactionalEntityManager.save(User, user);
        }

        // Update application status
        application.status = RoleApplicationStatus.APPROVED;
        application.decidedAt = new Date();
        application.decidedBy = adminUserId;

        await transactionalEntityManager.save(RoleApplication, application);
      });

      // P4: Send approval email to user (non-blocking, fire and forget)
      if (application.user) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
        const workspaceUrl = `${frontendUrl}/workspace/${application.role}`;
        const roleDisplayName = roleNames[application.role] || application.role;

        emailService.sendRoleApplicationApprovedEmail(application.user.email, {
          userName: application.user.name || application.user.email || 'User',
          roleName: roleDisplayName,
          businessName: application.businessName || 'N/A',
          approvedAt: application.decidedAt?.toLocaleString('ko-KR') || new Date().toLocaleString('ko-KR'),
          workspaceUrl
        })
          .then(() => {
            logger.info(`[P4] Role application approved email sent to ${application.user.email}`);
          })
          .catch((err) => {
            logger.error('[P4] Failed to send application approved email:', err);
          });

        // CI-2.4: Send in-app notification for role approval
        notificationService.createNotification({
          userId: application.userId,
          type: 'role.approved',
          title: '역할 신청이 승인되었습니다',
          message: `${roleDisplayName} 역할 신청이 승인되었습니다. 이제 ${roleDisplayName} 대시보드에 접근할 수 있습니다.`,
          metadata: {
            role: application.role,
            applicationId: application.id,
            workspaceUrl,
          },
          channel: 'in_app',
        }).catch(err => logger.error('[CI-2.4] Failed to send role.approved notification:', err));
      }

      res.json({
        success: true,
        message: 'Application approved successfully',
        application: {
          id: application.id,
          userId: application.userId,
          role: application.role,
          status: application.status,
          decidedAt: application.decidedAt
        }
      });
    } catch (error) {
      console.error('[APPROVE APPLICATION ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * POST /api/v2/admin/roles/applications/:id/reject
 * Reject a role application (admin only)
 * Phase 2-3: Rejection reason is now mandatory
 */
router.post('/applications/:id/reject',
  requireAuth,
  requireAdmin,
  param('id').isUUID(),
  body('reason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString()
    .isLength({ min: 10, max: 500 }).withMessage('Rejection reason must be between 10 and 500 characters'),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminUserId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      const applicationRepo = AppDataSource.getRepository(RoleApplication);

      const application = await applicationRepo.findOne({
        where: { id },
        relations: ['user']  // P4: Added to get user info for email
      });

      if (!application) {
        return res.status(404).json({
          error: 'Application not found',
          code: 'NOT_FOUND'
        });
      }

      if (application.status !== RoleApplicationStatus.PENDING) {
        return res.status(400).json({
          error: 'Application already processed',
          code: 'ALREADY_PROCESSED',
          currentStatus: application.status
        });
      }

      // Update application status
      application.status = RoleApplicationStatus.REJECTED;
      application.decidedAt = new Date();
      application.decidedBy = adminUserId;

      // Store rejection reason in metadata
      if (reason) {
        application.metadata = {
          ...application.metadata,
          rejectionReason: reason
        };
      }

      await applicationRepo.save(application);

      // P4: Send rejection email to user (non-blocking, fire and forget)
      if (application.user) {
        emailService.sendRoleApplicationRejectedEmail(application.user.email, {
          userName: application.user.name || application.user.email || 'User',
          roleName: roleNames[application.role] || application.role,
          businessName: application.businessName || 'N/A',
          appliedAt: application.appliedAt.toLocaleString('ko-KR'),
          rejectedAt: application.decidedAt?.toLocaleString('ko-KR') || new Date().toLocaleString('ko-KR'),
          reason
        })
          .then(() => {
            logger.info(`[P4] Role application rejected email sent to ${application.user.email}`);
          })
          .catch((err) => {
            logger.error('[P4] Failed to send application rejected email:', err);
          });
      }

      res.json({
        success: true,
        message: 'Application rejected successfully',
        application: {
          id: application.id,
          userId: application.userId,
          role: application.role,
          status: application.status,
          decidedAt: application.decidedAt
        }
      });
    } catch (error) {
      console.error('[REJECT APPLICATION ERROR]', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

export default router;
