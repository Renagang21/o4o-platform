/**
 * Membership-Yaksa Job Handlers
 * Phase 19-B: Permitted State Automation
 * Phase 20-B: Member Notification Integration
 *
 * Handlers for membership-yaksa scheduled jobs:
 * - Verification expiry check: Mark expired verifications + notify members
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
 * Phase 20-B: Also sends member notifications
 *
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
    const notificationsSent: string[] = [];

    for (const verification of expiredVerifications) {
      try {
        // Update verification status
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

        // Phase 20-B: Send member notification
        try {
          if (verification.memberId) {
            // Get member info for notification
            const memberInfo = await getMemberInfoForNotification(entityManager, verification.memberId);
            if (memberInfo) {
              await sendVerificationExpiredNotification(
                entityManager,
                verification.memberId,
                memberInfo.userId,
                {
                  memberName: memberInfo.name,
                  email: memberInfo.email,
                  licenseNumber: memberInfo.licenseNumber,
                }
              );
              notificationsSent.push(verification.memberId);
            }
          }
        } catch (notifError) {
          console.error('[VerificationExpiryCheck] Notification failed:', notifError);
          // Don't fail the main job for notification failures
        }
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
      summary: `Marked ${succeeded} verifications as expired, sent ${notificationsSent.length} notifications`,
      details: {
        affectedIds,
        notificationsSent,
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
 * Phase 20-B: Sends notifications at T-30 and T-7
 *
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

    // Also track T-7 threshold for high priority notifications
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 7);

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

    const affectedIds: string[] = [];
    const notificationsSent: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const verification of expiringVerifications) {
      try {
        const expiresAt = new Date(verification.expiresAt);
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Determine notification window (T-30 or T-7)
        const notificationWindow = daysUntilExpiry <= 7 ? '7' : '30';
        const lastNotifiedWindow = verification.metadata?.lastRenewalReminderWindow;

        // Skip if already notified for this window
        if (lastNotifiedWindow === notificationWindow) {
          continue;
        }

        // Update metadata
        await Verification.update(verification.id, {
          metadata: {
            ...verification.metadata,
            renewalReminderSentAt: new Date().toISOString(),
            lastRenewalReminderWindow: notificationWindow,
            daysUntilExpiry,
          },
        });
        affectedIds.push(verification.id);
        succeeded++;

        // Phase 20-B: Send member notification
        try {
          if (verification.memberId) {
            const memberInfo = await getMemberInfoForNotification(entityManager, verification.memberId);
            if (memberInfo) {
              await sendLicenseExpiringNotification(
                entityManager,
                verification.memberId,
                memberInfo.userId,
                daysUntilExpiry,
                {
                  memberName: memberInfo.name,
                  email: memberInfo.email,
                  licenseNumber: memberInfo.licenseNumber,
                }
              );
              notificationsSent.push(verification.memberId);
            }
          }
        } catch (notifError) {
          console.error('[LicenseRenewalReminder] Notification failed:', notifError);
        }
      } catch (error) {
        failed++;
        console.error('[LicenseRenewalReminder] Processing failed:', error);
      }
    }

    return {
      success: true,
      itemsProcessed: expiringVerifications.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Sent renewal reminders for ${succeeded} licenses, ${notificationsSent.length} notifications`,
      details: { affectedIds, notificationsSent },
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

// ============================================
// Helper Functions
// ============================================

/**
 * Get member info for notification
 */
async function getMemberInfoForNotification(
  entityManager: any,
  memberId: string
): Promise<{ userId: string; name: string; email?: string; licenseNumber?: string } | null> {
  try {
    const Member = entityManager.getRepository('Member');
    const member = await Member.findOne({ where: { id: memberId } });
    if (!member) return null;

    return {
      userId: member.userId,
      name: member.name,
      email: member.email,
      licenseNumber: member.licenseNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Send verification expired notification via raw SQL
 */
async function sendVerificationExpiredNotification(
  entityManager: any,
  memberId: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await entityManager.query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'in_app', false, NOW())`,
      [
        userId,
        'member.verification_expired',
        '자격 검증 만료',
        '자격 검증이 만료되었습니다. 재검증을 진행해 주세요.',
        JSON.stringify({
          ...metadata,
          memberId,
          priority: 'high',
        }),
      ]
    );
  } catch (error) {
    console.error('[SendVerificationExpiredNotification] Failed:', error);
  }
}

/**
 * Send license expiring notification via raw SQL
 */
async function sendLicenseExpiringNotification(
  entityManager: any,
  memberId: string,
  userId: string,
  daysUntilExpiry: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const priority = daysUntilExpiry <= 7 ? 'high' : 'normal';
    const title = daysUntilExpiry <= 7 ? '면허 만료 임박' : '면허 만료 예정';

    await entityManager.query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'in_app', false, NOW())`,
      [
        userId,
        'member.license_expiring',
        title,
        `면허가 ${daysUntilExpiry}일 후 만료 예정입니다. 갱신을 준비해 주세요.`,
        JSON.stringify({
          ...metadata,
          memberId,
          daysUntilExpiry,
          priority,
        }),
      ]
    );
  } catch (error) {
    console.error('[SendLicenseExpiringNotification] Failed:', error);
  }
}
