/**
 * YaksaReportSubmissionService
 *
 * Service for submitting approved YaksaReports to external systems
 *
 * Phase 18-C: File-based submission
 * Phase 20: External API submission
 */

import type { DataSource, Repository } from 'typeorm';
import { YaksaReport, YaksaReportStatus, YaksaSubmissionResult } from '../entities/YaksaReport.js';
import { YaksaReportHistory } from '../entities/YaksaReportHistory.js';
import type { SubmissionProvider, SubmissionOptions } from './providers/SubmissionProvider.js';
import { FileSubmissionProvider } from './providers/FileSubmissionProvider.js';

/**
 * Actor information for audit logging
 */
export interface SubmissionActor {
  id: string;
  name: string;
  role?: string;
  ipAddress?: string;
}

/**
 * Submission response
 */
export interface SubmissionResponse {
  success: boolean;
  reportId: string;
  status: YaksaReportStatus;
  result?: YaksaSubmissionResult;
  error?: string;
}

let reportRepository: Repository<YaksaReport> | null = null;
let historyRepository: Repository<YaksaReportHistory> | null = null;
let submissionProvider: SubmissionProvider | null = null;

/**
 * Initialize the YaksaReportSubmissionService
 */
export function initYaksaReportSubmissionService(
  dataSource: DataSource,
  provider?: SubmissionProvider
): void {
  reportRepository = dataSource.getRepository(YaksaReport);
  historyRepository = dataSource.getRepository(YaksaReportHistory);
  submissionProvider = provider || new FileSubmissionProvider();
}

/**
 * Get the current submission provider
 */
export function getSubmissionProvider(): SubmissionProvider {
  if (!submissionProvider) {
    throw new Error('YaksaReportSubmissionService not initialized');
  }
  return submissionProvider;
}

/**
 * Set a custom submission provider
 */
export function setSubmissionProvider(provider: SubmissionProvider): void {
  submissionProvider = provider;
}

/**
 * Submit an approved report
 *
 * @param reportId - The report ID to submit
 * @param actor - The actor performing the submission
 * @param options - Optional submission options
 * @returns Submission response
 */
export async function submitApprovedReport(
  reportId: string,
  actor: SubmissionActor,
  options?: SubmissionOptions
): Promise<SubmissionResponse> {
  if (!reportRepository || !historyRepository || !submissionProvider) {
    throw new Error('YaksaReportSubmissionService not initialized');
  }

  // Load report
  const report = await reportRepository.findOne({ where: { id: reportId } });

  if (!report) {
    return {
      success: false,
      reportId,
      status: 'DRAFT' as YaksaReportStatus,
      error: 'Report not found',
    };
  }

  // Validate status - only APPROVED reports can be submitted
  if (!report.canSubmit()) {
    return {
      success: false,
      reportId,
      status: report.status,
      error: `Report cannot be submitted. Current status: ${report.status}. Only APPROVED reports can be submitted.`,
    };
  }

  // Execute submission
  const result = await submissionProvider.submit(report, options);

  // Update report with submission result
  const previousStatus = report.status;

  if (result.success) {
    report.status = 'SUBMITTED';
    report.submittedAt = result.submittedAt;
    report.submittedBy = actor.id;
  }

  report.submissionResult = result;

  await reportRepository.save(report);

  // Create history entry
  const history = historyRepository.create({
    reportId: report.id,
    action: result.success ? 'SUBMITTED' : 'SUBMISSION_FAILED',
    previousStatus,
    newStatus: report.status,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    ipAddress: actor.ipAddress,
    details: {
      submissionResult: result,
      provider: submissionProvider.name,
    },
  });

  await historyRepository.save(history);

  return {
    success: result.success,
    reportId,
    status: report.status,
    result,
    error: result.errorMessage,
  };
}

/**
 * Retry a failed submission
 *
 * @param reportId - The report ID to retry
 * @param actor - The actor performing the retry
 * @param options - Optional submission options
 * @returns Submission response
 */
export async function retrySubmission(
  reportId: string,
  actor: SubmissionActor,
  options?: SubmissionOptions
): Promise<SubmissionResponse> {
  if (!reportRepository || !historyRepository || !submissionProvider) {
    throw new Error('YaksaReportSubmissionService not initialized');
  }

  // Load report
  const report = await reportRepository.findOne({ where: { id: reportId } });

  if (!report) {
    return {
      success: false,
      reportId,
      status: 'DRAFT' as YaksaReportStatus,
      error: 'Report not found',
    };
  }

  // Validate - must be APPROVED with a failed previous submission
  if (!report.canRetrySubmission() && report.status !== 'APPROVED') {
    return {
      success: false,
      reportId,
      status: report.status,
      error: `Report cannot be retried. Status: ${report.status}, Previous submission success: ${report.submissionResult?.success}`,
    };
  }

  // Execute submission
  const result = await submissionProvider.submit(report, options);

  // Update retry count
  result.retryCount = (report.submissionResult?.retryCount || 0) + 1;
  result.lastRetryAt = new Date();

  // Update report
  const previousStatus = report.status;

  if (result.success) {
    report.status = 'SUBMITTED';
    report.submittedAt = result.submittedAt;
    report.submittedBy = actor.id;
  }

  report.submissionResult = result;

  await reportRepository.save(report);

  // Create history entry
  const history = historyRepository.create({
    reportId: report.id,
    action: result.success ? 'SUBMITTED' : 'SUBMISSION_RETRY_FAILED',
    previousStatus,
    newStatus: report.status,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    ipAddress: actor.ipAddress,
    details: {
      submissionResult: result,
      retryCount: result.retryCount,
      provider: submissionProvider.name,
    },
  });

  await historyRepository.save(history);

  return {
    success: result.success,
    reportId,
    status: report.status,
    result,
    error: result.errorMessage,
  };
}

/**
 * Get submission status for a report
 *
 * @param reportId - The report ID to check
 * @returns Submission status information
 */
export async function getSubmissionStatus(
  reportId: string
): Promise<{
  reportId: string;
  status: YaksaReportStatus;
  canSubmit: boolean;
  canRetry: boolean;
  submissionResult?: YaksaSubmissionResult;
}> {
  if (!reportRepository) {
    throw new Error('YaksaReportSubmissionService not initialized');
  }

  const report = await reportRepository.findOne({ where: { id: reportId } });

  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  return {
    reportId: report.id,
    status: report.status,
    canSubmit: report.canSubmit(),
    canRetry: report.canRetrySubmission(),
    submissionResult: report.submissionResult,
  };
}

/**
 * Get submission statistics
 */
export async function getSubmissionStats(): Promise<{
  pendingSubmission: number;
  submitted: number;
  failed: number;
}> {
  if (!reportRepository) {
    throw new Error('YaksaReportSubmissionService not initialized');
  }

  const [pendingSubmission, submitted] = await Promise.all([
    reportRepository.count({ where: { status: 'APPROVED' as YaksaReportStatus } }),
    reportRepository.count({ where: { status: 'SUBMITTED' as YaksaReportStatus } }),
  ]);

  // Count failed submissions (APPROVED status but with failed submission result)
  const approvedWithResult = await reportRepository
    .createQueryBuilder('report')
    .where('report.status = :status', { status: 'APPROVED' })
    .andWhere('report.submissionResult IS NOT NULL')
    .andWhere("report.submissionResult->>'success' = 'false'")
    .getCount();

  return {
    pendingSubmission: pendingSubmission - approvedWithResult,
    submitted,
    failed: approvedWithResult,
  };
}

export default {
  initYaksaReportSubmissionService,
  getSubmissionProvider,
  setSubmissionProvider,
  submitApprovedReport,
  retrySubmission,
  getSubmissionStatus,
  getSubmissionStats,
};
