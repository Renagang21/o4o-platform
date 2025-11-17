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
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { User } from '../entities/User.js';
import { authenticateCookie, AuthRequest } from '../middleware/auth.js';
import { emailService } from '../services/email.service.js';
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
 * Admin authorization middleware
 * Checks if user has admin/administrator role assignment
 */
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    const assignmentRepo = AppDataSource.getRepository(RoleAssignment);
    const adminAssignment = await assignmentRepo.findOne({
      where: [
        { userId, role: 'admin', isActive: true },
        { userId, role: 'administrator', isActive: true },
        { userId, role: 'super_admin', isActive: true },
      ]
    });

    if (!adminAssignment) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Admin role required'
      });
    }

    next();
  } catch (error) {
    console.error('[ADMIN CHECK ERROR]', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * GET /api/v2/admin/roles/applications
 * Get all role applications (admin only)
 */
router.get('/applications',
  authenticateCookie,
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
  authenticateCookie,
  requireAdmin,
  param('id').isUUID(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminUserId = (req.user as any)?.userId || (req.user as any)?.id;
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

        emailService.sendRoleApplicationApprovedEmail(application.user.email, {
          userName: application.user.name || application.user.username || 'User',
          roleName: roleNames[application.role] || application.role,
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
 */
router.post('/applications/:id/reject',
  authenticateCookie,
  requireAdmin,
  param('id').isUUID(),
  body('reason').optional().isString().isLength({ max: 500 }),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminUserId = (req.user as any)?.userId || (req.user as any)?.id;
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
          userName: application.user.name || application.user.username || 'User',
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
