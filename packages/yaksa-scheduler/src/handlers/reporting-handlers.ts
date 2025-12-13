/**
 * Reporting-Yaksa Job Handlers
 * Phase 19-B: Permitted State Automation
 *
 * Handlers for reporting-yaksa scheduled jobs:
 * - Failed submission retry: Retry failed external submissions
 * - Report deadline reminder: Notify of upcoming report deadlines
 *
 * HUMAN-IN-THE-LOOP REQUIRED:
 * - Report approval
 * - Initial submission decision
 * - Manual override of failed submissions
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';
import { schedulerService } from '../backend/services/SchedulerService.js';

/**
 * Failed Submission Retry Handler
 *
 * Retries previously failed external submissions (MCIS, etc).
 * This is an allowed automation because:
 * 1. The report was already approved by a human
 * 2. The submission was already attempted
 * 3. We're just retrying due to transient failures
 */
export const failedSubmissionRetryHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const YaksaReport = entityManager.getRepository('YaksaReport');

    // Find approved reports with failed submission status
    const failedReports = await YaksaReport.createQueryBuilder('report')
      .where('report.status = :status', { status: 'APPROVED' })
      .andWhere('report.submissionStatus = :subStatus', { subStatus: 'FAILED' })
      .andWhere('report.submissionRetryCount < :maxRetries', {
        maxRetries: job.config?.maxRetries ?? 3,
      })
      .andWhere('report.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .orderBy('report.submissionFailedAt', 'ASC')
      .take(10) // Process 10 at a time
      .getMany();

    if (failedReports.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No failed submissions to retry',
      };
    }

    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];

    for (const report of failedReports) {
      try {
        // Update retry count first
        await YaksaReport.update(report.id, {
          submissionRetryCount: (report.submissionRetryCount ?? 0) + 1,
          submissionLastRetryAt: new Date(),
        });

        // Attempt submission (mock - actual implementation would call MCIS API)
        const submissionResult = await attemptExternalSubmission(report);

        if (submissionResult.success) {
          await YaksaReport.update(report.id, {
            submissionStatus: 'SUBMITTED',
            status: 'SUBMITTED',
            submittedAt: new Date(),
            externalReferenceId: submissionResult.referenceId,
          });
          affectedIds.push(report.id);
          succeeded++;
        } else {
          // Update failure info
          await YaksaReport.update(report.id, {
            submissionStatus: 'FAILED',
            submissionError: submissionResult.error,
            submissionFailedAt: new Date(),
          });

          // If max retries reached, add to failure queue for manual attention
          if ((report.submissionRetryCount ?? 0) + 1 >= (job.config?.maxRetries ?? 3)) {
            await schedulerService.addToFailureQueue({
              jobId: job.id,
              organizationId: job.organizationId,
              targetService: 'reporting-yaksa',
              actionType: 'failed_submission_retry',
              targetEntityId: report.id,
              targetEntityType: 'YaksaReport',
              error: submissionResult.error || 'Max retries exceeded',
              context: {
                reportType: report.type,
                originalError: report.submissionError,
                retryCount: report.submissionRetryCount,
              },
            });
          }

          failed++;
          failedItems.push({
            id: report.id,
            reason: submissionResult.error || 'Submission failed',
          });
        }
      } catch (error) {
        failed++;
        failedItems.push({
          id: report.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: succeeded > 0 || failed === 0,
      itemsProcessed: failedReports.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Retried ${failedReports.length} submissions: ${succeeded} succeeded, ${failed} failed`,
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
      summary: 'Failed to process submission retries',
    };
  }
};

/**
 * Report Deadline Reminder Handler
 *
 * Sends reminders for reports with upcoming deadlines.
 * Does NOT auto-submit - just sends notifications.
 */
export const reportDeadlineReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const YaksaReport = entityManager.getRepository('YaksaReport');

    // Find reports with deadlines within warning period
    const warningDays = job.config?.expiryWarningDays ?? 7;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    const now = new Date();

    const upcomingReports = await YaksaReport.createQueryBuilder('report')
      .where('report.status IN (:...statuses)', {
        statuses: ['DRAFT', 'REVIEWED'],
      })
      .andWhere('report.deadline > :now', { now })
      .andWhere('report.deadline <= :warningDate', { warningDate })
      .andWhere('report.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (upcomingReports.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No reports with upcoming deadlines',
      };
    }

    // In a real implementation, this would send notifications
    const affectedIds = upcomingReports.map((r) => r.id);

    // Mark that reminder was sent
    for (const report of upcomingReports) {
      await YaksaReport.update(report.id, {
        metadata: {
          ...report.metadata,
          deadlineReminderSentAt: new Date().toISOString(),
          reminderCount: (report.metadata?.reminderCount ?? 0) + 1,
        },
      });
    }

    return {
      success: true,
      itemsProcessed: upcomingReports.length,
      itemsSucceeded: upcomingReports.length,
      itemsFailed: 0,
      summary: `Sent deadline reminders for ${upcomingReports.length} reports`,
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

/**
 * Mock external submission function
 * In real implementation, this would call the MCIS API
 */
async function attemptExternalSubmission(report: any): Promise<{
  success: boolean;
  referenceId?: string;
  error?: string;
}> {
  // This is a mock implementation
  // Real implementation would call external API

  // Simulate random success/failure for testing
  // In production, this would be replaced with actual API call
  const success = Math.random() > 0.3; // 70% success rate for testing

  if (success) {
    return {
      success: true,
      referenceId: `MCIS-${Date.now()}-${report.id.substring(0, 8)}`,
    };
  } else {
    return {
      success: false,
      error: 'External API temporarily unavailable',
    };
  }
}
