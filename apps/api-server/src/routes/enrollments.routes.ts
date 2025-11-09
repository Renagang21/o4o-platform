import { Router } from 'express';
import { AppDataSource } from '../database/connection.js';
import { RoleEnrollment } from '../entities/RoleEnrollment.js';
import { AuditLog } from '../entities/AuditLog.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AuthRequest } from '../types/auth.js';
import { enrollmentEmailService } from '../services/EnrollmentEmailService.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * POST /enrollments
 *
 * Create a new role enrollment (application)
 *
 * @body { role: 'supplier'|'seller'|'partner', fields: {...}, agree?: {...} }
 * @returns 201 { id, user_id, role, status: "pending", submitted_at, ... }
 */
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { role, fields, agree } = req.body;
  const user = req.user!;

  try {
    // Validate role
    const validRoles = ['supplier', 'seller', 'partner'];
    if (!role || !validRoles.includes(role)) {
      return res.status(422).json({
        code: 'INVALID_ROLE',
        message: 'Invalid role. Must be one of: supplier, seller, partner',
        details: { validRoles }
      });
    }

    // Validate required fields exist
    if (!fields || typeof fields !== 'object') {
      return res.status(422).json({
        code: 'MISSING_FIELDS',
        message: 'Application fields are required'
      });
    }

    const enrollmentRepo = AppDataSource.getRepository(RoleEnrollment);

    // Check for existing pending/on_hold enrollment (prevent duplicates)
    const existing = await enrollmentRepo.findOne({
      where: {
        userId: user.id,
        role,
        status: ['PENDING', 'ON_HOLD'] as any
      }
    });

    if (existing) {
      return res.status(409).json({
        code: 'ENROLLMENT_EXISTS',
        message: `You already have a ${existing.status.toLowerCase()} ${role} application`,
        details: {
          enrollmentId: existing.id,
          status: existing.status,
          submittedAt: existing.createdAt
        }
      });
    }

    // Create enrollment
    const enrollment = enrollmentRepo.create({
      userId: user.id,
      role,
      status: 'PENDING',
      applicationData: {
        ...fields,
        agreedToTerms: agree || null,
        submittedAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await enrollmentRepo.save(enrollment);

    // Create audit log
    const auditLogRepo = AppDataSource.getRepository(AuditLog);
    const auditLog = auditLogRepo.create({
      userId: user.id,
      action: 'enrollment.create',
      entityType: 'RoleEnrollment',
      entityId: enrollment.id,
      changes: [
        { field: 'status', oldValue: null, newValue: 'PENDING' },
        { field: 'role', oldValue: null, newValue: role },
        { field: 'fieldsCount', oldValue: 0, newValue: Object.keys(fields).length }
      ],
      reason: 'User submitted role application',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await auditLogRepo.save(auditLog);

    logger.info('Role enrollment created', {
      enrollmentId: enrollment.id,
      userId: user.id,
      role,
      status: 'PENDING'
    });

    // P1 Phase B-3: Send enrollment created email
    await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);

    return res.status(201).json({
      id: enrollment.id,
      user_id: enrollment.userId,
      role: enrollment.role,
      status: enrollment.status,
      submitted_at: enrollment.createdAt,
      application_data: enrollment.applicationData
    });
  } catch (error) {
    logger.error('Error creating enrollment', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
      role
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create enrollment'
    });
  }
});

/**
 * GET /enrollments/my
 *
 * Get current user's enrollment history
 *
 * @returns 200 { enrollments: [ {id, role, status, submitted_at, decided_at? ...}, ... ] }
 */
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;

  try {
    const enrollmentRepo = AppDataSource.getRepository(RoleEnrollment);

    const enrollments = await enrollmentRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' }
    });

    const response = enrollments.map(enrollment => ({
      id: enrollment.id,
      role: enrollment.role,
      status: enrollment.status,
      submitted_at: enrollment.createdAt,
      decided_at: enrollment.reviewedAt || null,
      decided_by: enrollment.reviewedBy || null,
      decision_reason: enrollment.reviewNote || null,
      reason: enrollment.reason || null, // P1 Phase B-2
      reapply_after_at: enrollment.reapplyAfterAt || null, // P1 Phase B-2
      can_reapply: enrollment.canReapply(), // P1 Phase B-2
      application_data: enrollment.applicationData,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    }));

    return res.json({
      enrollments: response
    });
  } catch (error) {
    logger.error('Error fetching user enrollments', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch enrollments'
    });
  }
});

export default router;
