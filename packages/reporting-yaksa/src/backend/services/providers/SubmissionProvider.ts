/**
 * SubmissionProvider Interface
 *
 * Adapter pattern for report submission to different backends
 *
 * Strategy Pattern:
 * - FileSubmissionProvider (Phase 18-C) - File-based submission
 * - ApiSubmissionProvider (Phase 20) - External API submission
 */

import type { YaksaReport, YaksaSubmissionResult } from '../../entities/YaksaReport.js';

/**
 * Submission Options
 */
export interface SubmissionOptions {
  outputDir?: string;
  generatePdf?: boolean;
  generateJson?: boolean;
  externalApiUrl?: string;
  dryRun?: boolean;
}

/**
 * SubmissionProvider Interface
 *
 * All submission providers must implement this interface
 */
export interface SubmissionProvider {
  /**
   * Provider name for logging/identification
   */
  readonly name: string;

  /**
   * Submit a report
   *
   * @param report - The approved YaksaReport to submit
   * @param options - Optional submission options
   * @returns Submission result
   */
  submit(
    report: YaksaReport,
    options?: SubmissionOptions
  ): Promise<YaksaSubmissionResult>;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Base error class for submission errors
 */
export class SubmissionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'SubmissionError';
  }
}

export default SubmissionProvider;
