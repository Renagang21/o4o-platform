/**
 * Reporting-Yaksa Entities
 *
 * 신상신고 앱의 엔티티 모듈
 */

export { AnnualReport } from './AnnualReport.js';
export type { ReportStatus } from './AnnualReport.js';

export { ReportFieldTemplate } from './ReportFieldTemplate.js';
export type { ReportFieldDefinition } from './ReportFieldTemplate.js';

export { ReportLog, createReportLog } from './ReportLog.js';
export type { ReportLogAction } from './ReportLog.js';

export { ReportAssignment } from './ReportAssignment.js';
export type { AssignmentRole, AssignmentStatus } from './ReportAssignment.js';

// RPA 기반 신고서 (forum-yaksa 연동)
export { YaksaReport } from './YaksaReport.js';
export type { YaksaReportType, YaksaReportStatus } from './YaksaReport.js';

export { YaksaReportHistory } from './YaksaReportHistory.js';
export type { YaksaReportAction } from './YaksaReportHistory.js';

/**
 * 모든 엔티티 배열 (TypeORM 등록용)
 */
export const ReportingYaksaEntities = [
  // Lazy import to avoid circular dependency issues
  // Use: import('./AnnualReport.js').then(m => m.AnnualReport)
];
