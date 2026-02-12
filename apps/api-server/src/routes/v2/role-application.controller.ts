/**
 * Role Application Controller (v2)
 * WO-KPA-PHARMACY-APPLICATION-STABILIZATION-V1
 *
 * Handles user role application workflow:
 * - POST /apply — Submit a role application
 * - GET /applications/my — List my applications
 */

import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { RoleApplication, RoleApplicationStatus } from '../../entities/RoleApplication.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { emailService } from '../../services/email.service.js';
import logger from '../../utils/logger.js';
import type { AuthRequest } from '../../types/auth.js';

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
    return;
  }
  next();
};

export function createRoleApplicationController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(RoleApplication);

  /**
   * POST /api/v2/roles/apply
   * 역할 신청
   */
  router.post(
    '/apply',
    authenticate,
    [
      body('role').isString().notEmpty().withMessage('Role is required'),
      body('businessName').optional().isString().trim(),
      body('businessNumber').optional().isString().trim(),
      body('note').optional().isString().trim(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const userName = authReq.user!.name || authReq.user!.email;
        const userEmail = authReq.user!.email;
        const { role, businessName, businessNumber, note } = req.body;

        // Normalize business number (strip non-digits)
        const normalizedBN = businessNumber ? businessNumber.replace(/\D/g, '') : undefined;

        // Check for existing approved application with same role
        const approved = await repo.findOne({
          where: {
            userId,
            role,
            status: RoleApplicationStatus.APPROVED,
          },
        });

        if (approved) {
          res.status(409).json({
            success: false,
            error: '이미 승인된 동일 역할이 존재합니다.',
            code: 'ROLE_ALREADY_GRANTED',
          });
          return;
        }

        // Check for existing pending application with same role
        const pending = await repo.findOne({
          where: {
            userId,
            role,
            status: RoleApplicationStatus.PENDING,
          },
        });

        if (pending) {
          res.status(409).json({
            success: false,
            error: '이미 심사 대기 중인 동일 역할 신청이 있습니다.',
            code: 'APPLICATION_PENDING',
          });
          return;
        }

        // Create application
        const application = repo.create({
          userId,
          role,
          status: RoleApplicationStatus.PENDING,
          businessName: businessName || undefined,
          businessNumber: normalizedBN || undefined,
          note: note || undefined,
          appliedAt: new Date(),
        });

        const saved = await repo.save(application);

        // Send email notifications (non-blocking)
        const appliedAtStr = new Date().toISOString().split('T')[0];
        try {
          await emailService.sendRoleApplicationSubmittedEmail(userEmail, {
            userName,
            roleName: role,
            businessName: businessName || '-',
            businessNumber: normalizedBN || '-',
            appliedAt: appliedAtStr,
          });
        } catch (emailError) {
          logger.warn('[RoleApplication] Failed to send applicant email:', emailError);
        }

        try {
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@neture.co.kr';
          await emailService.sendRoleApplicationAdminNotificationEmail(adminEmail, {
            userName,
            userEmail,
            roleName: role,
            businessName: businessName || '-',
            businessNumber: normalizedBN || '-',
            appliedAt: appliedAtStr,
            note: note || undefined,
          });
        } catch (emailError) {
          logger.warn('[RoleApplication] Failed to send admin notification email:', emailError);
        }

        res.status(201).json({
          success: true,
          data: {
            id: saved.id,
            role: saved.role,
            status: saved.status,
            businessName: saved.businessName,
            businessNumber: saved.businessNumber,
            appliedAt: saved.appliedAt,
          },
        });
      } catch (error: any) {
        logger.error('[RoleApplication] Apply failed:', error);
        res.status(500).json({
          success: false,
          error: 'Application submission failed',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/v2/roles/applications/my
   * 내 신청 목록 조회
   */
  router.get(
    '/applications/my',
    authenticate,
    [
      query('status').optional().isIn(['pending', 'approved', 'rejected']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const statusFilter = req.query.status as string | undefined;

        const qb = repo.createQueryBuilder('app')
          .where('app.user_id = :userId', { userId });

        if (statusFilter) {
          qb.andWhere('app.status = :status', { status: statusFilter });
        }

        qb.orderBy('app.created_at', 'DESC');

        const applications = await qb.getMany();

        res.json({
          success: true,
          data: applications.map(app => ({
            id: app.id,
            role: app.role,
            status: app.status,
            businessName: app.businessName,
            businessNumber: app.businessNumber,
            note: app.note,
            appliedAt: app.appliedAt,
            decidedAt: app.decidedAt,
            decidedBy: app.decidedBy,
            createdAt: app.createdAt,
          })),
        });
      } catch (error: any) {
        logger.error('[RoleApplication] List my applications failed:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve applications',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  return router;
}
