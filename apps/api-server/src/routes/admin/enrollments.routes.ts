import { Router } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { RoleEnrollment } from '../../entities/RoleEnrollment.js';
import { RoleAssignment } from '../../entities/RoleAssignment.js';
import { User, UserStatus } from '../../entities/User.js';
import { ApprovalLog } from '../../entities/ApprovalLog.js';
import { AuditLog } from '../../entities/AuditLog.js';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { AuthRequest } from '../../types/auth.js';
import { enrollmentEmailService } from '../../services/EnrollmentEmailService.js';
import logger from '../../utils/logger.js';
import { In, Like, Between } from 'typeorm';

const router: Router = Router();

/**
 * GET /admin/enrollments
 *
 * List role enrollments with filters
 *
 * @query role - Filter by role (supplier|seller|partner)
 * @query status - Filter by status (pending|approved|rejected|on_hold)
 * @query q - Search by email or name
 * @query date_from - Filter by submission date (start)
 * @query date_to - Filter by submission date (end)
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 */
router.get('/', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      role,
      status,
      q,
      date_from,
      date_to,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const enrollmentRepo = AppDataSource.getRepository(RoleEnrollment);
    const queryBuilder = enrollmentRepo.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.user', 'user');

    // Filter by role
    if (role && ['supplier', 'seller', 'partner'].includes(role as string)) {
      queryBuilder.andWhere('enrollment.role = :role', { role });
    }

    // Filter by status
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'].includes((status as string).toUpperCase())) {
      queryBuilder.andWhere('enrollment.status = :status', { status: (status as string).toUpperCase() });
    }

    // Search by email or name
    if (q) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR user.name LIKE :search)',
        { search: `%${q}%` }
      );
    }

    // Filter by date range
    if (date_from) {
      queryBuilder.andWhere('enrollment.createdAt >= :dateFrom', { dateFrom: new Date(date_from as string) });
    }
    if (date_to) {
      queryBuilder.andWhere('enrollment.createdAt <= :dateTo', { dateTo: new Date(date_to as string) });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const enrollments = await queryBuilder
      .orderBy('enrollment.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getMany();

    const items = enrollments.map(enrollment => ({
      id: enrollment.id,
      user: {
        id: enrollment.userId,
        email: enrollment.user?.email,
        name: enrollment.user?.name
      },
      role: enrollment.role,
      status: enrollment.status,
      submitted_at: enrollment.createdAt,
      decided_at: enrollment.reviewedAt,
      decided_by: enrollment.reviewedBy,
      decision_reason: enrollment.reviewNote,
      reason: enrollment.reason, // P1 Phase B-2
      reapply_after_at: enrollment.reapplyAfterAt, // P1 Phase B-2
      application_data: enrollment.applicationData
    }));

    return res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching enrollments', {
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch enrollments'
    });
  }
});

/**
 * PATCH /admin/enrollments/:id/approve
 *
 * Approve a role enrollment
 *
 * Creates RoleAssignment and updates User status if needed
 *
 * @body { reason?: string }
 */
router.patch('/:id/approve', requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const admin = req.user!;

  const connection = AppDataSource;
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const enrollmentRepo = queryRunner.manager.getRepository(RoleEnrollment);
    const assignmentRepo = queryRunner.manager.getRepository(RoleAssignment);
    const userRepo = queryRunner.manager.getRepository(User);
    const approvalLogRepo = queryRunner.manager.getRepository(ApprovalLog);
    const auditLogRepo = queryRunner.manager.getRepository(AuditLog);

    // Get enrollment
    const enrollment = await enrollmentRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!enrollment) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Enrollment not found'
      });
    }

    // Check if already approved (idempotency)
    if (enrollment.status === 'APPROVED') {
      await queryRunner.rollbackTransaction();
      return res.json({
        ok: true,
        message: 'Enrollment already approved',
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          decided_at: enrollment.reviewedAt
        }
      });
    }

    // Only allow approval from PENDING or ON_HOLD
    if (!enrollment.canApprove()) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `Cannot approve enrollment with status ${enrollment.status}`
      });
    }

    // Update enrollment status using entity method
    const previousStatus = enrollment.status;
    enrollment.approve(admin.id, reason || 'Approved by admin');
    await enrollmentRepo.save(enrollment);

    // Create or update RoleAssignment (upsert pattern)
    let assignment = await assignmentRepo.findOne({
      where: {
        userId: enrollment.userId,
        role: enrollment.role
      }
    });

    if (assignment) {
      // Reactivate existing assignment
      assignment.isActive = true;
      assignment.validFrom = new Date();
      assignment.validUntil = null;
      assignment.assignedBy = admin.id;
      assignment.assignedAt = new Date();
    } else {
      // Create new assignment
      assignment = assignmentRepo.create({
        userId: enrollment.userId,
        role: enrollment.role,
        isActive: true,
        validFrom: new Date(),
        assignedBy: admin.id,
        assignedAt: new Date()
      });
    }

    await assignmentRepo.save(assignment);

    // Update user status if PENDING
    const user = await userRepo.findOne({ where: { id: enrollment.userId } });
    if (user && user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
      user.approvedAt = new Date();
      user.approvedBy = admin.id;
      await userRepo.save(user);
    }

    // Create ApprovalLog
    const approvalLog = approvalLogRepo.create({
      user_id: enrollment.userId,
      admin_id: admin.id,
      action: 'approved' as const,
      previous_status: previousStatus,
      new_status: 'APPROVED',
      notes: reason || 'Approved by admin',
      metadata: {
        entity: 'RoleEnrollment',
        entityId: enrollment.id,
        role: enrollment.role,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });
    await approvalLogRepo.save(approvalLog);

    // Create AuditLog
    const auditLog = auditLogRepo.create({
      userId: admin.id,
      action: 'enrollment.approve',
      entityType: 'RoleEnrollment',
      entityId: enrollment.id,
      changes: [
        { field: 'status', oldValue: previousStatus, newValue: 'APPROVED' },
        { field: 'reviewedBy', oldValue: null, newValue: admin.id },
        { field: 'assignmentId', oldValue: null, newValue: assignment.id }
      ],
      reason: reason || 'Approved by admin',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    await auditLogRepo.save(auditLog);

    await queryRunner.commitTransaction();

    logger.info('Enrollment approved', {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      role: enrollment.role,
      adminId: admin.id,
      assignmentId: assignment.id
    });

    // P1 Phase B-3: Send approval email
    const enrolledUser = enrollment.user;
    if (enrolledUser) {
      await enrollmentEmailService.sendEnrollmentApproved(
        enrollment,
        enrolledUser,
        reason
      );
    }

    return res.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        decided_at: enrollment.reviewedAt,
        decided_by: enrollment.reviewedBy
      },
      assignment: {
        id: assignment.id,
        role: assignment.role,
        is_active: assignment.isActive,
        valid_from: assignment.validFrom
      }
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();

    logger.error('Error approving enrollment', {
      error: error instanceof Error ? error.message : String(error),
      enrollmentId: id,
      adminId: admin.id
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve enrollment'
    });
  } finally {
    await queryRunner.release();
  }
});

/**
 * PATCH /admin/enrollments/:id/reject
 *
 * Reject a role enrollment
 *
 * @body { reason: string, cooldownHours?: number } (reason required)
 */
router.patch('/:id/reject', requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason, cooldownHours = 24 } = req.body; // P1 Phase B-2: Default 24h cooldown
  const admin = req.user!;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(422).json({
      code: 'REASON_REQUIRED',
      message: 'Rejection reason is required'
    });
  }

  const connection = AppDataSource;
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const enrollmentRepo = queryRunner.manager.getRepository(RoleEnrollment);
    const approvalLogRepo = queryRunner.manager.getRepository(ApprovalLog);
    const auditLogRepo = queryRunner.manager.getRepository(AuditLog);

    const enrollment = await enrollmentRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!enrollment) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Enrollment not found'
      });
    }

    // Check if already rejected (idempotency)
    if (enrollment.status === 'REJECTED') {
      await queryRunner.rollbackTransaction();
      return res.json({
        ok: true,
        message: 'Enrollment already rejected'
      });
    }

    const previousStatus = enrollment.status;

    // P1 Phase B-2: Calculate reapply date based on cooldown
    const reapplyAfterAt = new Date();
    reapplyAfterAt.setHours(reapplyAfterAt.getHours() + cooldownHours);

    // Update enrollment using entity method
    enrollment.reject(admin.id, reason, reapplyAfterAt);
    await enrollmentRepo.save(enrollment);

    // Create ApprovalLog
    const approvalLog = approvalLogRepo.create({
      user_id: enrollment.userId,
      admin_id: admin.id,
      action: 'rejected' as const,
      previous_status: previousStatus,
      new_status: 'REJECTED',
      notes: reason,
      metadata: {
        entity: 'RoleEnrollment',
        entityId: enrollment.id,
        role: enrollment.role,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });
    await approvalLogRepo.save(approvalLog);

    // Create AuditLog
    const auditLog = auditLogRepo.create({
      userId: admin.id,
      action: 'enrollment.reject',
      entityType: 'RoleEnrollment',
      entityId: enrollment.id,
      changes: [
        { field: 'status', oldValue: previousStatus, newValue: 'REJECTED' },
        { field: 'reviewedBy', oldValue: null, newValue: admin.id }
      ],
      reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    await auditLogRepo.save(auditLog);

    await queryRunner.commitTransaction();

    logger.info('Enrollment rejected', {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      role: enrollment.role,
      adminId: admin.id,
      reason,
      cooldownHours,
      reapplyAfterAt
    });

    // P1 Phase B-3: Send rejection email
    const enrolledUser = enrollment.user;
    if (enrolledUser) {
      await enrollmentEmailService.sendEnrollmentRejected(
        enrollment,
        enrolledUser,
        reason,
        reapplyAfterAt
      );
    }

    return res.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        decided_at: enrollment.reviewedAt,
        decided_by: enrollment.reviewedBy,
        reason: enrollment.reason,
        reapply_after_at: enrollment.reapplyAfterAt
      }
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();

    logger.error('Error rejecting enrollment', {
      error: error instanceof Error ? error.message : String(error),
      enrollmentId: id,
      adminId: admin.id
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reject enrollment'
    });
  } finally {
    await queryRunner.release();
  }
});

/**
 * PATCH /admin/enrollments/:id/hold
 *
 * Put enrollment on hold (needs additional information)
 *
 * @body { reason: string, required_fields?: string[] }
 */
router.patch('/:id/hold', requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason, required_fields } = req.body;
  const admin = req.user!;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(422).json({
      code: 'REASON_REQUIRED',
      message: 'Hold reason is required'
    });
  }

  const connection = AppDataSource;
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const enrollmentRepo = queryRunner.manager.getRepository(RoleEnrollment);
    const approvalLogRepo = queryRunner.manager.getRepository(ApprovalLog);
    const auditLogRepo = queryRunner.manager.getRepository(AuditLog);

    const enrollment = await enrollmentRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!enrollment) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Enrollment not found'
      });
    }

    const previousStatus = enrollment.status;

    // Build review note with required fields if provided
    let reviewNoteText = reason;
    if (required_fields && Array.isArray(required_fields) && required_fields.length > 0) {
      reviewNoteText += `\n\nRequired fields: ${required_fields.join(', ')}`;
    }

    // Update enrollment using entity method
    enrollment.hold(admin.id, reviewNoteText);
    await enrollmentRepo.save(enrollment);

    // Create ApprovalLog
    const approvalLog = approvalLogRepo.create({
      user_id: enrollment.userId,
      admin_id: admin.id,
      action: 'status_changed' as const,
      previous_status: previousStatus,
      new_status: 'ON_HOLD',
      notes: reviewNoteText,
      metadata: {
        entity: 'RoleEnrollment',
        entityId: enrollment.id,
        role: enrollment.role,
        required_fields: required_fields || null,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });
    await approvalLogRepo.save(approvalLog);

    // Create AuditLog
    const auditLog = auditLogRepo.create({
      userId: admin.id,
      action: 'enrollment.hold',
      entityType: 'RoleEnrollment',
      entityId: enrollment.id,
      changes: [
        { field: 'status', oldValue: previousStatus, newValue: 'ON_HOLD' },
        { field: 'reviewedBy', oldValue: null, newValue: admin.id },
        { field: 'requiredFields', oldValue: null, newValue: required_fields || null }
      ],
      reason: reviewNoteText,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    await auditLogRepo.save(auditLog);

    await queryRunner.commitTransaction();

    logger.info('Enrollment put on hold', {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      role: enrollment.role,
      adminId: admin.id,
      reason,
      required_fields
    });

    // P1 Phase B-3: Send hold email
    const enrolledUser = enrollment.user;
    if (enrolledUser) {
      await enrollmentEmailService.sendEnrollmentHeld(
        enrollment,
        enrolledUser,
        reason,
        required_fields
      );
    }

    return res.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        reviewer_note: enrollment.reviewNote,
        reason: enrollment.reason,
        required_fields: required_fields || null
      }
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();

    logger.error('Error putting enrollment on hold', {
      error: error instanceof Error ? error.message : String(error),
      enrollmentId: id,
      adminId: admin.id
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to put enrollment on hold'
    });
  } finally {
    await queryRunner.release();
  }
});

/**
 * POST /admin/enrollments/bulk-approve
 *
 * Bulk approve enrollments (P1 Phase D-1)
 *
 * @body { ids: string[], reason?: string }
 * @returns { success: number, failed: number, results: Array<{ id, status, message }> }
 */
router.post('/bulk-approve', requireAdmin, async (req: AuthRequest, res) => {
  const { ids, reason } = req.body;
  const admin = req.user!;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(422).json({
      code: 'INVALID_INPUT',
      message: 'ids must be a non-empty array'
    });
  }

  // Limit to 1000 items
  if (ids.length > 1000) {
    return res.status(422).json({
      code: 'TOO_MANY_ITEMS',
      message: 'Cannot process more than 1000 items at once'
    });
  }

  const results: Array<{ id: string; status: 'success' | 'failed'; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  const enrollmentRepo = AppDataSource.getRepository(RoleEnrollment);
  const assignmentRepo = AppDataSource.getRepository(RoleAssignment);
  const userRepo = AppDataSource.getRepository(User);
  const approvalLogRepo = AppDataSource.getRepository(ApprovalLog);
  const auditLogRepo = AppDataSource.getRepository(AuditLog);

  for (const id of ids) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get enrollment
      const enrollment = await queryRunner.manager.getRepository(RoleEnrollment).findOne({
        where: { id },
        relations: ['user']
      });

      if (!enrollment) {
        results.push({ id, status: 'failed', message: 'Not found' });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Skip if already approved (idempotency)
      if (enrollment.status === 'APPROVED') {
        results.push({ id, status: 'success', message: 'Already approved' });
        successCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Check if can approve
      if (!enrollment.canApprove()) {
        results.push({ id, status: 'failed', message: `Cannot approve from status ${enrollment.status}` });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Approve enrollment
      const previousStatus = enrollment.status;
      enrollment.approve(admin.id, reason || 'Bulk approved by admin');
      await queryRunner.manager.getRepository(RoleEnrollment).save(enrollment);

      // Create or update RoleAssignment
      let assignment = await queryRunner.manager.getRepository(RoleAssignment).findOne({
        where: {
          userId: enrollment.userId,
          role: enrollment.role
        }
      });

      if (assignment) {
        assignment.isActive = true;
        assignment.validFrom = new Date();
        assignment.validUntil = null;
        assignment.assignedBy = admin.id;
        assignment.assignedAt = new Date();
      } else {
        assignment = queryRunner.manager.getRepository(RoleAssignment).create({
          userId: enrollment.userId,
          role: enrollment.role,
          isActive: true,
          validFrom: new Date(),
          assignedBy: admin.id,
          assignedAt: new Date()
        });
      }

      await queryRunner.manager.getRepository(RoleAssignment).save(assignment);

      // Update user status if PENDING
      const user = await queryRunner.manager.getRepository(User).findOne({ where: { id: enrollment.userId } });
      if (user && user.status === UserStatus.PENDING) {
        user.status = UserStatus.ACTIVE;
        user.approvedAt = new Date();
        user.approvedBy = admin.id;
        await queryRunner.manager.getRepository(User).save(user);
      }

      // Create ApprovalLog
      const approvalLog = queryRunner.manager.getRepository(ApprovalLog).create({
        user_id: enrollment.userId,
        admin_id: admin.id,
        action: 'approved' as const,
        previous_status: previousStatus,
        new_status: 'APPROVED',
        notes: reason || 'Bulk approved by admin',
        metadata: {
          entity: 'RoleEnrollment',
          entityId: enrollment.id,
          role: enrollment.role,
          bulk: true,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      });
      await queryRunner.manager.getRepository(ApprovalLog).save(approvalLog);

      // Create AuditLog
      const auditLog = queryRunner.manager.getRepository(AuditLog).create({
        userId: admin.id,
        action: 'APPROVE_ENROLLMENT',
        entityType: 'RoleEnrollment',
        entityId: enrollment.id,
        reason: `Bulk approved: ${enrollment.role} for user ${enrollment.userId}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      await queryRunner.manager.getRepository(AuditLog).save(auditLog);

      await queryRunner.commitTransaction();
      results.push({ id, status: 'success', message: 'Approved' });
      successCount++;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error in bulk approve', {
        error: error instanceof Error ? error.message : String(error),
        enrollmentId: id
      });
      results.push({ id, status: 'failed', message: 'Internal error' });
      failedCount++;
    } finally {
      await queryRunner.release();
    }
  }

  return res.json({
    success: successCount,
    failed: failedCount,
    total: ids.length,
    results
  });
});

/**
 * POST /admin/enrollments/bulk-reject
 *
 * Bulk reject enrollments (P1 Phase D-1)
 *
 * @body { ids: string[], reason: string, reapply_after_days?: number }
 */
router.post('/bulk-reject', requireAdmin, async (req: AuthRequest, res) => {
  const { ids, reason, reapply_after_days } = req.body;
  const admin = req.user!;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(422).json({
      code: 'INVALID_INPUT',
      message: 'ids must be a non-empty array'
    });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(422).json({
      code: 'REASON_REQUIRED',
      message: 'Rejection reason is required'
    });
  }

  if (ids.length > 1000) {
    return res.status(422).json({
      code: 'TOO_MANY_ITEMS',
      message: 'Cannot process more than 1000 items at once'
    });
  }

  const results: Array<{ id: string; status: 'success' | 'failed'; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (const id of ids) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enrollment = await queryRunner.manager.getRepository(RoleEnrollment).findOne({
        where: { id },
        relations: ['user']
      });

      if (!enrollment) {
        results.push({ id, status: 'failed', message: 'Not found' });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Skip if already rejected
      if (enrollment.status === 'REJECTED') {
        results.push({ id, status: 'success', message: 'Already rejected' });
        successCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Check if can reject
      if (!enrollment.canReject()) {
        results.push({ id, status: 'failed', message: `Cannot reject from status ${enrollment.status}` });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Reject enrollment
      const previousStatus = enrollment.status;
      const reapplyAfter = reapply_after_days
        ? new Date(Date.now() + reapply_after_days * 24 * 60 * 60 * 1000)
        : undefined;

      enrollment.reject(admin.id, reason, reapplyAfter);
      await queryRunner.manager.getRepository(RoleEnrollment).save(enrollment);

      // Create ApprovalLog
      const approvalLog = queryRunner.manager.getRepository(ApprovalLog).create({
        user_id: enrollment.userId,
        admin_id: admin.id,
        action: 'rejected' as const,
        previous_status: previousStatus,
        new_status: 'REJECTED',
        notes: reason,
        metadata: {
          entity: 'RoleEnrollment',
          entityId: enrollment.id,
          role: enrollment.role,
          bulk: true,
          reapply_after_days,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      });
      await queryRunner.manager.getRepository(ApprovalLog).save(approvalLog);

      // Create AuditLog
      const auditLog = queryRunner.manager.getRepository(AuditLog).create({
        userId: admin.id,
        action: 'REJECT_ENROLLMENT',
        entityType: 'RoleEnrollment',
        entityId: enrollment.id,
        reason: `Bulk rejected: ${reason}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      await queryRunner.manager.getRepository(AuditLog).save(auditLog);

      await queryRunner.commitTransaction();
      results.push({ id, status: 'success', message: 'Rejected' });
      successCount++;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error in bulk reject', {
        error: error instanceof Error ? error.message : String(error),
        enrollmentId: id
      });
      results.push({ id, status: 'failed', message: 'Internal error' });
      failedCount++;
    } finally {
      await queryRunner.release();
    }
  }

  return res.json({
    success: successCount,
    failed: failedCount,
    total: ids.length,
    results
  });
});

/**
 * POST /admin/enrollments/bulk-hold
 *
 * Bulk put enrollments on hold (P1 Phase D-1)
 *
 * @body { ids: string[], reason: string, required_fields?: string[] }
 */
router.post('/bulk-hold', requireAdmin, async (req: AuthRequest, res) => {
  const { ids, reason, required_fields } = req.body;
  const admin = req.user!;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(422).json({
      code: 'INVALID_INPUT',
      message: 'ids must be a non-empty array'
    });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(422).json({
      code: 'REASON_REQUIRED',
      message: 'Hold reason is required'
    });
  }

  if (ids.length > 1000) {
    return res.status(422).json({
      code: 'TOO_MANY_ITEMS',
      message: 'Cannot process more than 1000 items at once'
    });
  }

  const results: Array<{ id: string; status: 'success' | 'failed'; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (const id of ids) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enrollment = await queryRunner.manager.getRepository(RoleEnrollment).findOne({
        where: { id },
        relations: ['user']
      });

      if (!enrollment) {
        results.push({ id, status: 'failed', message: 'Not found' });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Skip if already on hold
      if (enrollment.status === 'ON_HOLD') {
        results.push({ id, status: 'success', message: 'Already on hold' });
        successCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Check if can hold
      if (!enrollment.canHold()) {
        results.push({ id, status: 'failed', message: `Cannot hold from status ${enrollment.status}` });
        failedCount++;
        await queryRunner.rollbackTransaction();
        continue;
      }

      // Hold enrollment
      const previousStatus = enrollment.status;
      enrollment.hold(admin.id, reason);
      await queryRunner.manager.getRepository(RoleEnrollment).save(enrollment);

      // Create ApprovalLog
      const approvalLog = queryRunner.manager.getRepository(ApprovalLog).create({
        user_id: enrollment.userId,
        admin_id: admin.id,
        action: 'status_changed' as const,
        previous_status: previousStatus,
        new_status: 'ON_HOLD',
        notes: reason,
        metadata: {
          entity: 'RoleEnrollment',
          entityId: enrollment.id,
          role: enrollment.role,
          bulk: true,
          required_fields,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      });
      await queryRunner.manager.getRepository(ApprovalLog).save(approvalLog);

      // Create AuditLog
      const auditLog = queryRunner.manager.getRepository(AuditLog).create({
        userId: admin.id,
        action: 'HOLD_ENROLLMENT',
        entityType: 'RoleEnrollment',
        entityId: enrollment.id,
        reason: `Bulk put on hold: ${reason}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      await queryRunner.manager.getRepository(AuditLog).save(auditLog);

      await queryRunner.commitTransaction();
      results.push({ id, status: 'success', message: 'Put on hold' });
      successCount++;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error in bulk hold', {
        error: error instanceof Error ? error.message : String(error),
        enrollmentId: id
      });
      results.push({ id, status: 'failed', message: 'Internal error' });
      failedCount++;
    } finally {
      await queryRunner.release();
    }
  }

  return res.json({
    success: successCount,
    failed: failedCount,
    total: ids.length,
    results
  });
});

/**
 * GET /admin/enrollments/stats
 *
 * Get enrollment statistics for dashboard widgets
 *
 * @query since - Start date (ISO format, default: today 00:00)
 * @query until - End date (ISO format, default: now)
 */
router.get('/stats', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const enrollmentRepo = AppDataSource.getRepository(RoleEnrollment);

    // Get today's start (00:00)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get yesterday's range (00:00 - 24:00)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    // Count today's pending enrollments
    const todayPendingCount = await enrollmentRepo.count({
      where: {
        status: 'PENDING',
        createdAt: Between(todayStart, now) as any
      }
    });

    // Count yesterday's pending enrollments (for comparison)
    const yesterdayPendingCount = await enrollmentRepo.count({
      where: {
        status: 'PENDING',
        createdAt: Between(yesterdayStart, yesterdayEnd) as any
      }
    });

    const delta = todayPendingCount - yesterdayPendingCount;

    return res.json({
      pendingCount: todayPendingCount,
      yesterdayPendingCount,
      delta
    });
  } catch (error) {
    logger.error('Error fetching enrollment stats', {
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch enrollment stats'
    });
  }
});

export default router;
