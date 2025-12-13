/**
 * Reporting-Yaksa Services
 */

export { ReportTemplateService } from './ReportTemplateService.js';
export type { CreateTemplateDto, UpdateTemplateDto } from './ReportTemplateService.js';

export { AnnualReportService } from './AnnualReportService.js';
export type {
  CreateReportDto,
  UpdateReportDto,
  ReportFilterDto,
  ActorInfo,
} from './AnnualReportService.js';

export { MembershipSyncService, VALID_SYNC_TARGETS } from './MembershipSyncService.js';
export type { SyncResult, SyncTarget } from './MembershipSyncService.js';

// RPA 기반 신고서 서비스 (forum-yaksa 연동)
export {
  YaksaReportService,
  yaksaReportService,
  initYaksaReportService,
} from './YaksaReportService.js';
export type {
  CreateReportFromPostInput,
  UpdateReportInput,
  ListReportsOptions,
  ListReportsResult,
  Actor,
} from './YaksaReportService.js';
