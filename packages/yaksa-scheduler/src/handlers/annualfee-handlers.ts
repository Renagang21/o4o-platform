/**
 * Annualfee-Yaksa Job Handlers
 *
 * @deprecated Phase R2: 이 파일의 구현은 annualfee-yaksa 패키지로 이동되었습니다.
 * 실제 핸들러 구현은 packages/annualfee-yaksa/src/handlers/job-handlers.ts를 참조하세요.
 *
 * JobRegistry를 통해 domain app의 핸들러가 우선 사용됩니다.
 * 이 파일의 핸들러는 domain app이 활성화되지 않은 경우의 fallback입니다.
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * @deprecated Use annualfee-yaksa package handler
 */
export const invoiceOverdueCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] invoiceOverdueCheckHandler in yaksa-scheduler. Use annualfee-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to annualfee-yaksa. Activate annualfee-yaksa app to use real handler.',
  };
};

/**
 * @deprecated Use annualfee-yaksa package handler
 */
export const invoiceDueDateWarningHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] invoiceDueDateWarningHandler in yaksa-scheduler. Use annualfee-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to annualfee-yaksa. Activate annualfee-yaksa app to use real handler.',
  };
};

/**
 * @deprecated Use annualfee-yaksa package handler
 */
export const exemptionExpiryCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] exemptionExpiryCheckHandler in yaksa-scheduler. Use annualfee-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to annualfee-yaksa. Activate annualfee-yaksa app to use real handler.',
  };
};

/**
 * @deprecated Use annualfee-yaksa package handler
 */
export const settlementReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] settlementReminderHandler in yaksa-scheduler. Use annualfee-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to annualfee-yaksa. Activate annualfee-yaksa app to use real handler.',
  };
};
