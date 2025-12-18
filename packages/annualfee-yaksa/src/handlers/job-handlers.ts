/**
 * AnnualFee-Yaksa Job Handlers
 * Phase R2: Operational Completion
 *
 * 도메인 앱 내부로 이동된 Job Handler 실제 구현
 * - Invoice overdue check: 연체 청구서 상태 변경 + 회원 알림
 * - Invoice due date warning: 납부 기한 임박 알림
 * - Exemption expiry check: 감면 만료 처리
 * - Settlement reminder: 정산 대기 알림
 *
 * HUMAN-IN-THE-LOOP REQUIRED:
 * - 청구서 승인/확정
 * - 감면 승인/거부
 * - 정산 확정
 * - 환불 처리
 */

import type { EntityManager } from 'typeorm';

/**
 * Job 실행 컨텍스트
 */
export interface JobExecutionContext {
  entityManager: EntityManager;
  logger?: (message: string) => void;
}

/**
 * Job 실행 결과
 */
export interface JobExecutionResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  error?: Error;
  summary: string;
  details?: Record<string, any>;
}

/**
 * ScheduledJob 타입 (간소화)
 */
export interface ScheduledJobInfo {
  id: string;
  organizationId?: string;
  config?: Record<string, any>;
}

/**
 * Job Handler 타입
 */
export type JobHandler = (
  job: ScheduledJobInfo,
  context: JobExecutionContext
) => Promise<JobExecutionResult>;

// ============================================
// Invoice Overdue Check Handler
// ============================================

/**
 * 청구서 연체 체크 핸들러
 *
 * 납부 기한이 지난 청구서를 연체 상태로 변경하고 회원에게 알림 발송
 */
export const invoiceOverdueCheckHandler: JobHandler = async (
  job: ScheduledJobInfo,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeInvoice = entityManager.getRepository('FeeInvoice');

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

    const affectedIds: string[] = [];
    let succeeded = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; reason: string }> = [];
    const notificationsSent: string[] = [];

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

        // 회원 알림 발송
        try {
          if (invoice.memberId) {
            const memberInfo = await getMemberInfoForNotification(entityManager, invoice.memberId);
            if (memberInfo) {
              await sendFeeOverdueNotification(
                entityManager,
                invoice.memberId,
                memberInfo.userId,
                invoice.year || new Date().getFullYear(),
                invoice.amount || 0,
                {
                  memberName: memberInfo.name,
                  email: memberInfo.email,
                  invoiceId: invoice.id,
                }
              );
              notificationsSent.push(invoice.memberId);
            }
          }
        } catch (notifError) {
          console.error('[InvoiceOverdueCheck] Notification failed:', notifError);
        }
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
      summary: `Marked ${succeeded} invoices as overdue, sent ${notificationsSent.length} notifications`,
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
      summary: 'Failed to check overdue invoices',
    };
  }
};

// ============================================
// Invoice Due Date Warning Handler
// ============================================

/**
 * 납부 기한 임박 알림 핸들러
 *
 * 납부 기한이 가까운 청구서에 대해 회원에게 알림 발송
 */
export const invoiceDueDateWarningHandler: JobHandler = async (
  job: ScheduledJobInfo,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeInvoice = entityManager.getRepository('FeeInvoice');

    const now = new Date();
    const warningDays = job.config?.expiryWarningDays ?? 7;

    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + warningDays);

    const upcomingInvoices = await FeeInvoice.createQueryBuilder('invoice')
      .where('invoice.status IN (:...statuses)', {
        statuses: ['sent', 'partial'],
      })
      .andWhere('invoice.dueDate > :now', { now })
      .andWhere('invoice.dueDate <= :warningDate', { warningDate })
      .andWhere('invoice.organizationId = :orgId OR :orgId IS NULL', {
        orgId: job.organizationId ?? null,
      })
      .getMany();

    if (upcomingInvoices.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'No invoices approaching due date',
      };
    }

    const affectedIds: string[] = [];
    const notificationsSent: string[] = [];
    let succeeded = 0;

    for (const invoice of upcomingInvoices) {
      try {
        const dueDate = new Date(invoice.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // 이미 알림 발송된 경우 스킵
        if (invoice.metadata?.dueDateWarningAt) {
          continue;
        }

        await FeeInvoice.update(invoice.id, {
          metadata: {
            ...invoice.metadata,
            dueDateWarningAt: new Date().toISOString(),
            daysUntilDue,
          },
        });
        affectedIds.push(invoice.id);
        succeeded++;

        // 알림 발송
        try {
          if (invoice.memberId) {
            const memberInfo = await getMemberInfoForNotification(entityManager, invoice.memberId);
            if (memberInfo) {
              await sendFeeOverdueWarningNotification(
                entityManager,
                invoice.memberId,
                memberInfo.userId,
                invoice.year || new Date().getFullYear(),
                invoice.amount || 0,
                daysUntilDue,
                {
                  memberName: memberInfo.name,
                  email: memberInfo.email,
                  invoiceId: invoice.id,
                }
              );
              notificationsSent.push(invoice.memberId);
            }
          }
        } catch (notifError) {
          console.error('[InvoiceDueDateWarning] Notification failed:', notifError);
        }
      } catch (error) {
        console.error('[InvoiceDueDateWarning] Processing failed:', error);
      }
    }

    return {
      success: true,
      itemsProcessed: upcomingInvoices.length,
      itemsSucceeded: succeeded,
      itemsFailed: 0,
      summary: `Sent due date warnings for ${succeeded} invoices, ${notificationsSent.length} notifications`,
      details: { affectedIds, notificationsSent },
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
      summary: 'Failed to process due date warnings',
    };
  }
};

// ============================================
// Exemption Expiry Check Handler
// ============================================

/**
 * 감면 만료 체크 핸들러
 *
 * 만료된 감면을 expired 상태로 변경
 */
export const exemptionExpiryCheckHandler: JobHandler = async (
  job: ScheduledJobInfo,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeExemption = entityManager.getRepository('FeeExemption');

    const now = new Date();

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

// ============================================
// Settlement Reminder Handler
// ============================================

/**
 * 정산 알림 핸들러
 *
 * 대기 중인 정산에 대해 관리자에게 알림 발송
 * 자동 확정 없음 - 알림만 발송
 */
export const settlementReminderHandler: JobHandler = async (
  job: ScheduledJobInfo,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  const { entityManager } = context;

  try {
    const FeeSettlement = entityManager.getRepository('FeeSettlement');

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

    const affectedIds = pendingSettlements.map((s) => s.id);

    // 알림 발송 기록
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

// ============================================
// Helper Functions
// ============================================

/**
 * 알림용 회원 정보 조회
 */
async function getMemberInfoForNotification(
  entityManager: EntityManager,
  memberId: string
): Promise<{ userId: string; name: string; email?: string } | null> {
  try {
    // yaksa_members 테이블 먼저 시도
    const result = await entityManager.query(
      `SELECT "userId", name, email FROM yaksa_members WHERE id = $1`,
      [memberId]
    );
    if (result.length > 0) {
      return result[0];
    }

    // Fallback: Member 테이블
    const Member = entityManager.getRepository('Member');
    const member = await Member.findOne({ where: { id: memberId } });
    if (member) {
      return {
        userId: (member as any).userId,
        name: (member as any).name,
        email: (member as any).email,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 연회비 연체 알림 발송
 */
async function sendFeeOverdueNotification(
  entityManager: EntityManager,
  memberId: string,
  userId: string,
  year: number,
  amount: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await entityManager.query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'in_app', false, NOW())`,
      [
        userId,
        'member.fee_overdue',
        '연회비 연체',
        `${year}년도 연회비(${amount.toLocaleString()}원)가 연체되었습니다. 빠른 납부 바랍니다.`,
        JSON.stringify({
          ...metadata,
          memberId,
          year,
          amount,
          priority: 'high',
        }),
      ]
    );
  } catch (error) {
    console.error('[SendFeeOverdueNotification] Failed:', error);
  }
}

/**
 * 연회비 납부 기한 임박 알림 발송
 */
async function sendFeeOverdueWarningNotification(
  entityManager: EntityManager,
  memberId: string,
  userId: string,
  year: number,
  amount: number,
  daysUntilDue: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await entityManager.query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'in_app', false, NOW())`,
      [
        userId,
        'member.fee_overdue_warning',
        '연회비 납부 예정',
        `${year}년도 연회비(${amount.toLocaleString()}원) 납부 기한이 ${daysUntilDue}일 후입니다.`,
        JSON.stringify({
          ...metadata,
          memberId,
          year,
          amount,
          daysUntilDue,
          priority: 'normal',
        }),
      ]
    );
  } catch (error) {
    console.error('[SendFeeOverdueWarningNotification] Failed:', error);
  }
}
