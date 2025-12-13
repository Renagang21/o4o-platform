/**
 * FileSubmissionProvider
 *
 * File-based report submission (Phase 18-C)
 *
 * Generates PDF and JSON files and saves them to local storage
 * or object storage (S3-compatible)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { YaksaReport, YaksaSubmissionResult } from '../../entities/YaksaReport.js';
import type { SubmissionProvider, SubmissionOptions } from './SubmissionProvider.js';
import { SubmissionError } from './SubmissionProvider.js';

/**
 * Report type labels for display
 */
const REPORT_TYPE_LABELS: Record<string, string> = {
  PROFILE_UPDATE: '개인정보 변경 신고',
  LICENSE_CHANGE: '면허 관련 변경 신고',
  WORKPLACE_CHANGE: '근무지 변경 신고',
  AFFILIATION_CHANGE: '소속 변경 신고',
};

/**
 * FileSubmissionProvider
 *
 * Generates report files (PDF/JSON) and saves to file system
 */
export class FileSubmissionProvider implements SubmissionProvider {
  readonly name = 'FileSubmissionProvider';

  private readonly defaultOutputDir: string;

  constructor(outputDir?: string) {
    // Default to ./submissions in project root or tmp directory
    this.defaultOutputDir = outputDir || process.env['YAKSA_SUBMISSION_DIR'] || '/tmp/yaksa-submissions';
  }

  /**
   * Submit report by generating files
   */
  async submit(
    report: YaksaReport,
    options?: SubmissionOptions
  ): Promise<YaksaSubmissionResult> {
    const outputDir = options?.outputDir || this.defaultOutputDir;
    const generatePdf = options?.generatePdf !== false;
    const generateJson = options?.generateJson !== false;

    try {
      // Ensure output directory exists
      await this.ensureDir(outputDir);

      const submittedAt = new Date();
      const dateStr = this.formatDate(submittedAt);
      const baseFileName = `yaksa-report-${report.id.substring(0, 8)}-${dateStr}`;

      const outputFiles: Array<{ type: 'pdf' | 'json'; path: string; size?: number }> = [];

      // Generate JSON file
      if (generateJson) {
        const jsonPath = path.join(outputDir, `${baseFileName}.json`);
        const jsonContent = this.generateJsonContent(report, submittedAt);
        await this.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));

        const stats = await fs.promises.stat(jsonPath);
        outputFiles.push({
          type: 'json',
          path: jsonPath,
          size: stats.size,
        });
      }

      // Generate PDF file (simplified text-based PDF for now)
      if (generatePdf) {
        const pdfPath = path.join(outputDir, `${baseFileName}.pdf`);
        const pdfContent = this.generateSimplePdfContent(report, submittedAt);
        await this.writeFile(pdfPath, pdfContent);

        const stats = await fs.promises.stat(pdfPath);
        outputFiles.push({
          type: 'pdf',
          path: pdfPath,
          size: stats.size,
        });
      }

      // Generate external reference ID
      const externalRefId = `YAKSA-${dateStr}-${report.id.substring(0, 8).toUpperCase()}`;

      return {
        success: true,
        submittedAt,
        externalRefId,
        outputFiles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown submission error';

      return {
        success: false,
        submittedAt: new Date(),
        errorMessage,
        retryCount: (report.submissionResult?.retryCount || 0) + 1,
        lastRetryAt: new Date(),
      };
    }
  }

  /**
   * Check if file system is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureDir(this.defaultOutputDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.promises.access(dir);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Write file to disk
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Format date for file name
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Generate JSON content for report
   */
  private generateJsonContent(report: YaksaReport, submittedAt: Date): Record<string, any> {
    return {
      meta: {
        version: '1.0',
        generatedAt: submittedAt.toISOString(),
        reportId: report.id,
        reportType: report.reportType,
        reportTypeLabel: REPORT_TYPE_LABELS[report.reportType] || report.reportType,
      },
      member: {
        id: report.memberId,
        snapshot: report.memberSnapshot,
      },
      report: {
        status: report.status,
        payload: report.payload,
        confidence: report.confidence,
        createdAt: report.createdAt,
        approvedAt: report.approvedAt,
        approvedBy: report.approvedBy,
      },
      source: {
        postId: report.sourcePostId,
        triggerSnapshot: report.triggerSnapshot,
      },
      workflow: {
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt,
        operatorNotes: report.operatorNotes,
      },
    };
  }

  /**
   * Generate simplified PDF content
   *
   * Note: This generates a text-based pseudo-PDF for demonstration.
   * In production, use a proper PDF library like pdfkit or puppeteer.
   */
  private generateSimplePdfContent(report: YaksaReport, submittedAt: Date): string {
    const lines: string[] = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
      '4 0 obj << /Length 5 0 R >> stream',
      'BT',
      '/F1 12 Tf',
      '50 700 Td',
      `(약사회 신상신고서) Tj`,
      '0 -30 Td',
      `(신고 유형: ${REPORT_TYPE_LABELS[report.reportType] || report.reportType}) Tj`,
      '0 -20 Td',
      `(신고서 ID: ${report.id}) Tj`,
      '0 -20 Td',
      `(회원 ID: ${report.memberId}) Tj`,
      '0 -20 Td',
      `(생성일: ${report.createdAt?.toISOString()}) Tj`,
      '0 -20 Td',
      `(승인일: ${report.approvedAt?.toISOString() || '-'}) Tj`,
      '0 -20 Td',
      `(제출일: ${submittedAt.toISOString()}) Tj`,
      '0 -40 Td',
      `(내용:) Tj`,
      '0 -20 Td',
      `(${JSON.stringify(report.payload).substring(0, 100)}...) Tj`,
      'ET',
      'endstream',
      'endobj',
      '5 0 obj 500 endobj',
      'xref',
      '0 6',
      '0000000000 65535 f',
      '0000000009 00000 n',
      '0000000058 00000 n',
      '0000000115 00000 n',
      '0000000214 00000 n',
      '0000000800 00000 n',
      'trailer << /Size 6 /Root 1 0 R >>',
      'startxref',
      '820',
      '%%EOF',
    ];

    return lines.join('\n');
  }
}

export default FileSubmissionProvider;
