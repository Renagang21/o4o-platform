import type { Repository, DataSource } from 'typeorm';
import { YaksaCourseAssignment, AssignmentStatus } from '../entities/YaksaCourseAssignment.entity.js';
import { RequiredCoursePolicy } from '../entities/RequiredCoursePolicy.entity.js';

/**
 * CourseAssignmentService
 *
 * Manages course assignments for organization members.
 * Handles assignment CRUD, bulk operations, and status tracking.
 */
export class CourseAssignmentService {
  private repo: Repository<YaksaCourseAssignment>;
  private policyRepo: Repository<RequiredCoursePolicy>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(YaksaCourseAssignment);
    this.policyRepo = dataSource.getRepository(RequiredCoursePolicy);
  }

  /**
   * Get assignment by ID
   */
  async getAssignment(assignmentId: string): Promise<YaksaCourseAssignment | null> {
    return this.repo.findOne({ where: { id: assignmentId } });
  }

  /**
   * Get assignments for a user
   */
  async getAssignmentsByUser(userId: string): Promise<YaksaCourseAssignment[]> {
    return this.repo.find({
      where: { userId },
      order: { priority: 'DESC', dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get active assignments for a user
   */
  async getActiveAssignments(userId: string): Promise<YaksaCourseAssignment[]> {
    return this.repo.find({
      where: [
        { userId, status: AssignmentStatus.PENDING },
        { userId, status: AssignmentStatus.IN_PROGRESS },
      ],
      order: { priority: 'DESC', dueDate: 'ASC' },
    });
  }

  /**
   * Get assignments by organization
   */
  async getAssignmentsByOrganization(organizationId: string): Promise<YaksaCourseAssignment[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get assignments for a specific course
   */
  async getAssignmentsByCourse(courseId: string): Promise<YaksaCourseAssignment[]> {
    return this.repo.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get assignments by policy
   */
  async getAssignmentsByPolicy(policyId: string): Promise<YaksaCourseAssignment[]> {
    return this.repo.find({
      where: { policyId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Assign a course to a user
   */
  async assignCourse(
    userId: string,
    organizationId: string,
    courseId: string,
    options?: {
      policyId?: string;
      dueDate?: Date;
      assignedBy?: string;
      isMandatory?: boolean;
      priority?: number;
      note?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<YaksaCourseAssignment> {
    // Check for existing assignment
    const existing = await this.repo.findOne({
      where: { userId, courseId },
    });

    if (existing) {
      // Update existing assignment if it was cancelled or expired
      if (
        existing.status === AssignmentStatus.CANCELLED ||
        existing.status === AssignmentStatus.EXPIRED
      ) {
        return this.reactivateAssignment(existing.id, options);
      }
      // Return existing if still active
      return existing;
    }

    const assignment = this.repo.create({
      userId,
      organizationId,
      courseId,
      policyId: options?.policyId,
      assignedAt: new Date(),
      dueDate: options?.dueDate,
      assignedBy: options?.assignedBy,
      isMandatory: options?.isMandatory ?? true,
      priority: options?.priority ?? 0,
      note: options?.note,
      metadata: options?.metadata,
      status: AssignmentStatus.PENDING,
      isCompleted: false,
      progressPercent: 0,
    });

    return this.repo.save(assignment);
  }

  /**
   * Reactivate a cancelled or expired assignment
   */
  private async reactivateAssignment(
    assignmentId: string,
    options?: {
      dueDate?: Date;
      assignedBy?: string;
      note?: string;
    }
  ): Promise<YaksaCourseAssignment> {
    await this.repo.update(assignmentId, {
      status: AssignmentStatus.PENDING,
      isCompleted: false,
      completedAt: undefined,
      progressPercent: 0,
      assignedAt: new Date(),
      dueDate: options?.dueDate,
      assignedBy: options?.assignedBy,
      note: options?.note,
    });

    return (await this.getAssignment(assignmentId))!;
  }

  /**
   * Bulk assign a course to multiple users
   */
  async bulkAssignCourse(
    userIds: string[],
    organizationId: string,
    courseId: string,
    options?: {
      policyId?: string;
      dueDate?: Date;
      assignedBy?: string;
      isMandatory?: boolean;
    }
  ): Promise<YaksaCourseAssignment[]> {
    const assignments: YaksaCourseAssignment[] = [];

    for (const userId of userIds) {
      const assignment = await this.assignCourse(userId, organizationId, courseId, options);
      assignments.push(assignment);
    }

    return assignments;
  }

  /**
   * Assign courses based on policy
   */
  async assignByPolicy(
    policyId: string,
    userIds: string[],
    assignedBy?: string
  ): Promise<YaksaCourseAssignment[]> {
    const policy = await this.policyRepo.findOne({ where: { id: policyId } });
    if (!policy || !policy.isActive) {
      throw new Error('Policy not found or inactive');
    }

    const assignments: YaksaCourseAssignment[] = [];

    // Calculate due date based on policy's default configuration
    const dueDate = policy.validUntil
      ? new Date(policy.validUntil)
      : undefined;

    for (const courseId of policy.requiredCourseIds) {
      for (const userId of userIds) {
        const assignment = await this.assignCourse(
          userId,
          policy.organizationId,
          courseId,
          {
            policyId,
            dueDate,
            assignedBy,
            isMandatory: true,
            priority: policy.priority,
          }
        );
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  /**
   * Mark assignment as completed
   */
  async markCompleted(
    assignmentId: string,
    enrollmentId?: string
  ): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    await this.repo.update(assignmentId, {
      status: AssignmentStatus.COMPLETED,
      isCompleted: true,
      completedAt: new Date(),
      progressPercent: 100,
      enrollmentId: enrollmentId ?? assignment.enrollmentId,
    });

    return this.getAssignment(assignmentId);
  }

  /**
   * Mark assignment as in progress
   */
  async markInProgress(
    assignmentId: string,
    enrollmentId?: string
  ): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    await this.repo.update(assignmentId, {
      status: AssignmentStatus.IN_PROGRESS,
      enrollmentId: enrollmentId ?? assignment.enrollmentId,
    });

    return this.getAssignment(assignmentId);
  }

  /**
   * Update assignment progress
   */
  async updateProgress(
    assignmentId: string,
    progressPercent: number
  ): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    const percent = Math.min(100, Math.max(0, progressPercent));
    const updates: Partial<YaksaCourseAssignment> = {
      progressPercent: percent,
    };

    if (percent > 0 && assignment.status === AssignmentStatus.PENDING) {
      updates.status = AssignmentStatus.IN_PROGRESS;
    }

    if (percent === 100) {
      updates.status = AssignmentStatus.COMPLETED;
      updates.isCompleted = true;
      updates.completedAt = new Date();
    }

    await this.repo.update(assignmentId, updates);
    return this.getAssignment(assignmentId);
  }

  /**
   * Link assignment to enrollment
   */
  async linkEnrollment(
    assignmentId: string,
    enrollmentId: string
  ): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    const updates: Partial<YaksaCourseAssignment> = {
      enrollmentId,
    };

    if (assignment.status === AssignmentStatus.PENDING) {
      updates.status = AssignmentStatus.IN_PROGRESS;
    }

    await this.repo.update(assignmentId, updates);
    return this.getAssignment(assignmentId);
  }

  /**
   * Cancel an assignment
   */
  async cancelAssignment(assignmentId: string): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    await this.repo.update(assignmentId, {
      status: AssignmentStatus.CANCELLED,
    });

    return this.getAssignment(assignmentId);
  }

  /**
   * Expire overdue assignments
   */
  async expireOverdueAssignments(): Promise<number> {
    const now = new Date();
    const result = await this.repo
      .createQueryBuilder()
      .update(YaksaCourseAssignment)
      .set({ status: AssignmentStatus.EXPIRED })
      .where('dueDate < :now', { now })
      .andWhere('status IN (:...statuses)', {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS],
      })
      .andWhere('isCompleted = false')
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Get overdue assignments
   */
  async getOverdueAssignments(organizationId?: string): Promise<YaksaCourseAssignment[]> {
    const now = new Date();
    const query: Record<string, any> = {
      isCompleted: false,
    };

    if (organizationId) {
      query.organizationId = organizationId;
    }

    const assignments = await this.repo.find({ where: query });

    return assignments.filter(a => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < now && a.isActive();
    });
  }

  /**
   * Get assignment statistics for a user
   */
  async getUserStatistics(userId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    expired: number;
    cancelled: number;
    overdue: number;
    completionRate: number;
  }> {
    const assignments = await this.getAssignmentsByUser(userId);
    const now = new Date();

    const stats = {
      total: assignments.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      expired: 0,
      cancelled: 0,
      overdue: 0,
      completionRate: 0,
    };

    for (const a of assignments) {
      switch (a.status) {
        case AssignmentStatus.COMPLETED:
          stats.completed++;
          break;
        case AssignmentStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case AssignmentStatus.PENDING:
          stats.pending++;
          break;
        case AssignmentStatus.EXPIRED:
          stats.expired++;
          break;
        case AssignmentStatus.CANCELLED:
          stats.cancelled++;
          break;
      }

      if (a.dueDate && !a.isCompleted && new Date(a.dueDate) < now) {
        stats.overdue++;
      }
    }

    const activeTotal = stats.completed + stats.inProgress + stats.pending + stats.expired;
    stats.completionRate = activeTotal > 0 ? (stats.completed / activeTotal) * 100 : 0;

    return stats;
  }

  /**
   * Get organization assignment statistics
   */
  async getOrganizationStatistics(organizationId: string): Promise<{
    totalAssignments: number;
    completedAssignments: number;
    activeAssignments: number;
    overdueAssignments: number;
    completionRate: number;
    memberCount: number;
  }> {
    const assignments = await this.getAssignmentsByOrganization(organizationId);
    const now = new Date();

    let completed = 0;
    let active = 0;
    let overdue = 0;
    const memberIds = new Set<string>();

    for (const a of assignments) {
      memberIds.add(a.userId);

      if (a.status === AssignmentStatus.COMPLETED) {
        completed++;
      } else if (a.isActive()) {
        active++;
        if (a.dueDate && new Date(a.dueDate) < now) {
          overdue++;
        }
      }
    }

    const total = completed + active;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalAssignments: assignments.length,
      completedAssignments: completed,
      activeAssignments: active,
      overdueAssignments: overdue,
      completionRate,
      memberCount: memberIds.size,
    };
  }

  /**
   * Check if user has completed a course assignment
   */
  async hasCompletedCourse(userId: string, courseId: string): Promise<boolean> {
    const assignment = await this.repo.findOne({
      where: { userId, courseId, isCompleted: true },
    });
    return !!assignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    assignmentId: string,
    payload: Partial<YaksaCourseAssignment>
  ): Promise<YaksaCourseAssignment | null> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return null;

    await this.repo.update(assignmentId, payload);
    return this.getAssignment(assignmentId);
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<boolean> {
    const result = await this.repo.delete(assignmentId);
    return (result.affected ?? 0) > 0;
  }
}
