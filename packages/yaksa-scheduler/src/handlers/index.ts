/**
 * Yaksa Scheduler Job Handlers
 * Phase 19-B: Permitted State Automation
 * Phase 20-B: Member Notification Integration
 *
 * Central export of all job handlers.
 */

// Annualfee-Yaksa handlers
export {
  invoiceOverdueCheckHandler,
  invoiceDueDateWarningHandler,
  exemptionExpiryCheckHandler,
  settlementReminderHandler,
} from './annualfee-handlers.js';

// Membership-Yaksa handlers
export {
  verificationExpiryCheckHandler,
  licenseRenewalReminderHandler,
} from './membership-handlers.js';

// LMS-Yaksa handlers
export {
  assignmentExpiryCheckHandler,
  courseDeadlineReminderHandler,
} from './lms-handlers.js';

// Reporting-Yaksa handlers
export {
  failedSubmissionRetryHandler,
  reportDeadlineReminderHandler,
} from './reporting-handlers.js';

import { schedulerService } from '../backend/services/SchedulerService.js';
import { invoiceOverdueCheckHandler, invoiceDueDateWarningHandler, exemptionExpiryCheckHandler, settlementReminderHandler } from './annualfee-handlers.js';
import { verificationExpiryCheckHandler, licenseRenewalReminderHandler } from './membership-handlers.js';
import { assignmentExpiryCheckHandler, courseDeadlineReminderHandler } from './lms-handlers.js';
import { failedSubmissionRetryHandler, reportDeadlineReminderHandler } from './reporting-handlers.js';

/**
 * Register all job handlers with the scheduler service
 */
export function registerAllHandlers(): void {
  // Annualfee-Yaksa handlers
  schedulerService.registerHandler('annualfee-yaksa', 'invoice_overdue_check', invoiceOverdueCheckHandler);
  schedulerService.registerHandler('annualfee-yaksa', 'invoice_due_date_warning', invoiceDueDateWarningHandler);
  schedulerService.registerHandler('annualfee-yaksa', 'exemption_expiry_check', exemptionExpiryCheckHandler);
  schedulerService.registerHandler('annualfee-yaksa', 'settlement_reminder', settlementReminderHandler);

  // Membership-Yaksa handlers
  schedulerService.registerHandler('membership-yaksa', 'verification_expiry_check', verificationExpiryCheckHandler);
  schedulerService.registerHandler('membership-yaksa', 'license_renewal_reminder', licenseRenewalReminderHandler);

  // LMS-Yaksa handlers
  schedulerService.registerHandler('lms-yaksa', 'assignment_expiry_check', assignmentExpiryCheckHandler);
  schedulerService.registerHandler('lms-yaksa', 'course_deadline_reminder', courseDeadlineReminderHandler);

  // Reporting-Yaksa handlers
  schedulerService.registerHandler('reporting-yaksa', 'failed_submission_retry', failedSubmissionRetryHandler);
  schedulerService.registerHandler('reporting-yaksa', 'report_deadline_reminder', reportDeadlineReminderHandler);

  console.log('[yaksa-scheduler] Registered all job handlers');
}
