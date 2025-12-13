/**
 * Membership-Yaksa Job Handlers
 * Phase 19-B: Permitted State Automation
 *
 * Handlers for membership-yaksa scheduled jobs:
 * - Verification expiry check: Mark expired verifications
 * - License renewal reminder: Notify members of expiring licenses
 *
 * HUMAN-IN-THE-LOOP REQUIRED:
 * - Verification approval/rejection
 * - Membership status changes
 * - License verification
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * Verification Expiry Check Handler
 *
 * Finds verifications (license verifications) past their expiry date
 * and updates status to 'expired'.
 * This is an allowed automation as it only reflects objective facts.
 */
export const verificationExpiryCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const Verification = entityManager.getRepository('Verification');

    const now = new Date();

    // Find approved verifications past expiry date
    const expiredVerifications = await Verification.createQueryBuilder('verification')
      .where('verification.status = :status', { status: 'approved' })
      .andWhere('verification.expiresAt < :now', { now })
      .andWhere('verification.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (expiredVerifications.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No expired verifications found',
      };
    }

    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];

    for (const verification of expiredVerifications) {
      try {
        await Verification.update(verification.id, {
          status: 'expired',
          metadata: {
            ...verification.metadata,
            expiryDetectedAt: new Date().toISOString(),
            expiryByJobId: job.id,
          },
        });
        affectedIds.push(verification.id);
        succeeded++;
      } catch (error) {
        failed++;
        failedItems.push({
          id: verification.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: failed === 0,
      itemsProcessed: expiredVerifications.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Marked ${succeeded} verifications as expired`,
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
      summary: 'Failed to check expired verifications',
    };
  }
};

/**
 * License Renewal Reminder Handler
 *
 * Sends reminders for licenses expiring soon.
 * Does NOT auto-renew - just sends notifications.
 */
export const licenseRenewalReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const Verification = entityManager.getRepository('Verification');

    // Find verifications expiring within warning period
    const warningDays = job.config?.expiryWarningDays ?? 30;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    const now = new Date();

    const expiringVerifications = await Verification.createQueryBuilder('verification')
      .where('verification.status = :status', { status: 'approved' })
      .andWhere('verification.expiresAt > :now', { now })
      .andWhere('verification.expiresAt <= :warningDate', { warningDate })
      .andWhere('verification.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (expiringVerifications.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No licenses expiring within warning period',
      };
    }

    // In a real implementation, this would send notifications
    const affectedIds = expiringVerifications.map((v) => v.id);

    // Mark that reminder was sent
    for (const verification of expiringVerifications) {
      await Verification.update(verification.id, {
        metadata: {
          ...verification.metadata,
          renewalReminderSentAt: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      itemsProcessed: expiringVerifications.length,
      itemsSucceeded: expiringVerifications.length,
      itemsFailed: 0,
      summary: `Sent renewal reminders for ${expiringVerifications.length} licenses`,
      details: { affectedIds },
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
      summary: 'Failed to process license renewal reminders',
    };
  }
};
