/**
 * Membership-Yaksa Job Handlers
 *
 * @deprecated Phase R2: 이 파일의 구현은 membership-yaksa 패키지로 이동되었습니다.
 * 실제 핸들러 구현은 packages/membership-yaksa/src/handlers/job-handlers.ts를 참조하세요.
 *
 * JobRegistry를 통해 domain app의 핸들러가 우선 사용됩니다.
 * 이 파일의 핸들러는 domain app이 활성화되지 않은 경우의 fallback입니다.
 */

import type { JobHandler, JobExecutionContext, JobExecutionResult } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * @deprecated Use membership-yaksa package handler
 */
export const verificationExpiryCheckHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] verificationExpiryCheckHandler in yaksa-scheduler. Use membership-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to membership-yaksa. Activate membership-yaksa app to use real handler.',
  };
};

/**
 * @deprecated Use membership-yaksa package handler
 */
export const licenseRenewalReminderHandler: JobHandler = async (
  job: ScheduledJob,
  context: JobExecutionContext
): Promise<JobExecutionResult> => {
  console.warn('[DEPRECATED] licenseRenewalReminderHandler in yaksa-scheduler. Use membership-yaksa package.');
  return {
    success: false,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    summary: 'DEPRECATED: Handler moved to membership-yaksa. Activate membership-yaksa app to use real handler.',
  };
};
