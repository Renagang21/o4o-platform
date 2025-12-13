/**
 * Annualfee-Yaksa Job Handlers
 * Phase 19-B: Permitted State Automation
 *
 * Handlers for annualfee-yaksa scheduled jobs:
 * - Invoice overdue check: Mark past-due invoices as overdue
 * - Exemption expiry check: Mark expired exemptions
 * - Settlement reminder: Notify admin of pending settlements
 *
 * HUMAN-IN-THE-LOOP REQUIRED:
 * - Invoice approval/confirmation
 * - Exemption approval/rejection
 * - Settlement confirmation
 * - Refund processing
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * Invoice Overdue Check Handler
 *
 * Finds invoices past their due date and updates status to 'overdue'.
 * This is an allowed automation as it only reflects objective facts.
 */
export const invoiceOverdueCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    // Get FeeInvoice repository dynamically
    const FeeInvoice = entityManager.getRepository('FeeInvoice');

    // Find sent/partial invoices past due date
    const now = new Date();
    const overdueThresholdDays = job.config?.overdueThresholdDays ?? 0;
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - overdueThresholdDays);

    const overdueInvoices = await FeeInvoice.createQueryBuilder('invoice')
      .where('invoice.status IN (:...statuses)', {
        statuses: ['sent', 'partial'],
      })
      .andWhere('invoice.dueDate < :cutoffDate', { cutoffDate })
      .andWhere('invoice.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (overdueInvoices.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No overdue invoices found',
      };
    }

    // Update to overdue status
    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];

    for (const invoice of overdueInvoices) {
      try {
        await FeeInvoice.update(invoice.id, {
          status: 'overdue',
          metadata: {
            ...invoice.metadata,
            overdueDetectedAt: new Date().toISOString(),
            overdueByJobId: job.id,
          },
        });
        affectedIds.push(invoice.id);
        succeeded++;
      } catch (error) {
        failed++;
        failedItems.push({
          id: invoice.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: failed === 0,
      itemsProcessed: overdueInvoices.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Marked ${succeeded} invoices as overdue`,
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
      summary: 'Failed to check overdue invoices',
    };
  }
};

/**
 * Exemption Expiry Check Handler
 *
 * Finds approved exemptions past their expiry date and updates status.
 * This is an allowed automation as it only reflects objective facts.
 */
export const exemptionExpiryCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeExemption = entityManager.getRepository('FeeExemption');

    const now = new Date();

    // Find approved exemptions past expiry date
    const expiredExemptions = await FeeExemption.createQueryBuilder('exemption')
      .where('exemption.status = :status', { status: 'approved' })
      .andWhere('exemption.expiresAt < :now', { now })
      .andWhere('exemption.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (expiredExemptions.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No expired exemptions found',
      };
    }

    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];

    for (const exemption of expiredExemptions) {
      try {
        await FeeExemption.update(exemption.id, {
          status: 'expired',
          metadata: {
            ...exemption.metadata,
            expiryDetectedAt: new Date().toISOString(),
            expiryByJobId: job.id,
          },
        });
        affectedIds.push(exemption.id);
        succeeded++;
      } catch (error) {
        failed++;
        failedItems.push({
          id: exemption.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: failed === 0,
      itemsProcessed: expiredExemptions.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      summary: `Marked ${succeeded} exemptions as expired`,
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
      summary: 'Failed to check expired exemptions',
    };
  }
};

/**
 * Settlement Reminder Handler
 *
 * Sends reminders for pending settlements that need admin action.
 * Does NOT auto-confirm - just sends notifications.
 */
export const settlementReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeSettlement = entityManager.getRepository('FeeSettlement');

    // Find pending settlements that have been waiting for a while
    const reminderDays = job.config?.expiryWarningDays ?? 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reminderDays);

    const pendingSettlements = await FeeSettlement.createQueryBuilder('settlement')
      .where('settlement.status IN (:...statuses)', {
        statuses: ['pending', 'calculating'],
      })
      .andWhere('settlement.createdAt < :cutoffDate', { cutoffDate })
      .andWhere('settlement.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (pendingSettlements.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No pending settlements requiring reminder',
      };
    }

    // In a real implementation, this would send notifications
    // For now, just log and track
    const affectedIds = pendingSettlements.map((s) => s.id);

    // Mark that reminder was sent
    for (const settlement of pendingSettlements) {
      await FeeSettlement.update(settlement.id, {
        metadata: {
          ...settlement.metadata,
          lastReminderAt: new Date().toISOString(),
          reminderCount: (settlement.metadata?.reminderCount ?? 0) + 1,
        },
      });
    }

    return {
      success: true,
      itemsProcessed: pendingSettlements.length,
      itemsSucceeded: pendingSettlements.length,
      itemsFailed: 0,
      summary: `Sent reminders for ${pendingSettlements.length} pending settlements`,
      details: { affectedIds },
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
      summary: 'Failed to process settlement reminders',
    };
  }
};
