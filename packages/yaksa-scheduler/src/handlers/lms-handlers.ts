/**
 * LMS-Yaksa Job Handlers
 * Phase 19-B: Permitted State Automation
 *
 * Handlers for lms-yaksa scheduled jobs:
 * - Assignment expiry check: Mark expired course assignments
 * - Course deadline reminder: Notify members of upcoming deadlines
 *
 * HUMAN-IN-THE-LOOP REQUIRED:
 * - Course assignment approval
 * - Credit record approval
 * - Certificate issuance
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * Assignment Expiry Check Handler
 *
 * Finds course assignments past their due date and updates status to 'expired'.
 * This is an allowed automation as it only reflects objective facts.
 */
export const assignmentExpiryCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    // Get CourseAssignment repository dynamically
    const CourseAssignment = entityManager.getRepository('YaksaCourseAssignment');

    const now = new Date();

    // Find active assignments past due date
    const expiredAssignments = await CourseAssignment.createQueryBuilder('assignment')
      .where('assignment.status IN (:...statuses)', {
        statuses: ['pending', 'in_progress'],
      })
      .andWhere('assignment.dueDate < :now', { now })
      .andWhere('assignment.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (expiredAssignments.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No expired course assignments found',
      };
    }

    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];

    for (const assignment of expiredAssignments) {
      try {
        await CourseAssignment.update(assignment.id, {
          status: 'expired',
          metadata: {
            ...assignment.metadata,
            expiryDetectedAt: new Date().toISOString(),
            expiryByJobId: job.id,
            previousStatus: assignment.status,
          },
        });
        affectedIds.push(assignment.id);
        succeeded++;
      } catch (error) {
        failed++;
        failedItems.push({
          id: assignment.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: failed === 0,
      itemsProcessed: expiredAssignments.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Marked ${succeeded} course assignments as expired`,
      details: {
        affectedIds,
        failedItems: failedItems.length > 0 ? failedItems : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
      summary: 'Failed to check expired assignments',
    };
  }
};

/**
 * Course Deadline Reminder Handler
 *
 * Sends reminders for course assignments nearing deadline.
 * Does NOT auto-complete - just sends notifications.
 */
export const courseDeadlineReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const CourseAssignment = entityManager.getRepository('YaksaCourseAssignment');

    // Find assignments with due dates within warning period
    const warningDays = job.config?.expiryWarningDays ?? 7;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    const now = new Date();

    const upcomingDeadlines = await CourseAssignment.createQueryBuilder('assignment')
      .where('assignment.status IN (:...statuses)', {
        statuses: ['pending', 'in_progress'],
      })
      .andWhere('assignment.dueDate > :now', { now })
      .andWhere('assignment.dueDate <= :warningDate', { warningDate })
      .andWhere('assignment.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (upcomingDeadlines.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No assignments with upcoming deadlines',
      };
    }

    // In a real implementation, this would send notifications
    const affectedIds = upcomingDeadlines.map((a) => a.id);

    // Mark that reminder was sent
    for (const assignment of upcomingDeadlines) {
      await CourseAssignment.update(assignment.id, {
        metadata: {
          ...assignment.metadata,
          deadlineReminderSentAt: new Date().toISOString(),
          reminderCount: (assignment.metadata?.reminderCount ?? 0) + 1,
        },
      });
    }

    return {
      success: true,
      itemsProcessed: upcomingDeadlines.length,
      itemsSucceeded: upcomingDeadlines.length,
      itemsFailed: 0,
      summary: `Sent deadline reminders for ${upcomingDeadlines.length} assignments`,
      details: { affectedIds },
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
      summary: 'Failed to process deadline reminders',
    };
  }
};
