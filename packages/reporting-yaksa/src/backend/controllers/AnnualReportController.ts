import { DataSource } from 'typeorm';
import {
  AnnualReportService,
  CreateReportDto,
  UpdateReportDto,
  ReportFilterDto,
  ActorInfo,
} from '../services/AnnualReportService.js';
import { MembershipSyncService } from '../services/MembershipSyncService.js';
import { ReportStatus } from '../entities/AnnualReport.js';

/**
 * AnnualReportController
 *
 * 신상신고서 관리 API 컨트롤러
 */
export class AnnualReportController {
  private reportService: AnnualReportService;
  private syncService: MembershipSyncService;

  constructor(private dataSource: DataSource) {
    this.reportService = new AnnualReportService(dataSource);
    this.syncService = new MembershipSyncService(dataSource);
  }

  // ===== 회원용 API =====

  /**
   * GET /api/reporting/my-report
   * 내 신상신고서 조회 (현재 연도 또는 특정 연도)
   */
  async getMyReport(memberId: string, query: { year?: string }): Promise<{
    success: boolean;
    data: any | null;
  }> {
    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const report = await this.reportService.findByMemberAndYear(memberId, year);

    return {
      success: true,
      data: report,
    };
  }

  /**
   * GET /api/reporting/my-reports
   * 내 모든 신상신고서 목록
   */
  async getMyReports(memberId: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    const reports = await this.reportService.findByMember(memberId);

    return {
      success: true,
      data: reports,
    };
  }

  /**
   * POST /api/reporting/my-report
   * 내 신상신고서 생성 (초안)
   */
  async createMyReport(
    memberId: string,
    organizationId: string,
    body: { year?: number; fields?: Record<string, any> },
    actor?: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    const year = body.year || new Date().getFullYear();

    const report = await this.reportService.create(
      {
        memberId,
        organizationId,
        year,
        fields: body.fields,
      },
      actor
    );

    return {
      success: true,
      data: report,
    };
  }

  /**
   * PUT /api/reporting/my-report
   * 내 신상신고서 수정
   */
  async updateMyReport(
    memberId: string,
    body: { year?: number; fields: Record<string, any> },
    actor?: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    const year = body.year || new Date().getFullYear();
    const existing = await this.reportService.findByMemberAndYear(memberId, year);

    if (!existing) {
      throw new Error(`Report for year ${year} not found`);
    }

    const report = await this.reportService.update(
      existing.id,
      { fields: body.fields },
      actor
    );

    return {
      success: true,
      data: report,
    };
  }

  /**
   * POST /api/reporting/my-report/submit
   * 내 신상신고서 제출
   */
  async submitMyReport(
    memberId: string,
    body: { year?: number },
    actor?: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    const year = body.year || new Date().getFullYear();
    const existing = await this.reportService.findByMemberAndYear(memberId, year);

    if (!existing) {
      throw new Error(`Report for year ${year} not found`);
    }

    const report = await this.reportService.submit(existing.id, actor);

    return {
      success: true,
      data: report,
    };
  }

  /**
   * GET /api/reporting/my-report/:id/logs
   * 내 신상신고서 로그 조회
   */
  async getMyReportLogs(reportId: string, memberId: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    const report = await this.reportService.findById(reportId);

    if (!report) {
      throw new Error(`Report "${reportId}" not found`);
    }

    if (report.memberId !== memberId) {
      throw new Error('Access denied');
    }

    const logs = await this.reportService.getLogs(reportId);

    return {
      success: true,
      data: logs,
    };
  }

  // ===== 관리자용 API =====

  /**
   * GET /api/reporting/reports
   * 신상신고서 목록 조회 (관리자)
   */
  async list(query: {
    organizationId?: string;
    year?: string;
    status?: string;
    page?: string;
    limit?: string;
  }): Promise<{
    success: boolean;
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: ReportFilterDto = {};

    if (query.organizationId) {
      filter.organizationId = query.organizationId;
    }
    if (query.year) {
      filter.year = parseInt(query.year, 10);
    }
    if (query.status) {
      filter.status = query.status as ReportStatus;
    }
    if (query.page) {
      filter.page = parseInt(query.page, 10);
    }
    if (query.limit) {
      filter.limit = parseInt(query.limit, 10);
    }

    const { data, total } = await this.reportService.list(filter);

    return {
      success: true,
      data,
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  /**
   * GET /api/reporting/reports/:id
   * 신상신고서 상세 조회 (관리자)
   */
  async get(id: string): Promise<{
    success: boolean;
    data: any | null;
  }> {
    const report = await this.reportService.findById(id);

    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    return {
      success: true,
      data: report,
    };
  }

  /**
   * GET /api/reporting/reports/:id/logs
   * 신상신고서 로그 조회 (관리자)
   */
  async getLogs(id: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    const logs = await this.reportService.getLogs(id);

    return {
      success: true,
      data: logs,
    };
  }

  /**
   * PATCH /api/reporting/reports/:id/approve
   * 신상신고서 승인
   */
  async approve(
    id: string,
    body: { comment?: string; autoSync?: boolean },
    actor: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
    syncResult?: any;
  }> {
    const report = await this.reportService.approve(id, actor, body.comment);

    let syncResult;
    // 자동 동기화가 활성화된 경우
    if (body.autoSync !== false) {
      try {
        syncResult = await this.syncService.syncApprovedReport(id, actor);
      } catch (error: any) {
        // 동기화 실패해도 승인은 성공
        syncResult = { success: false, error: error.message };
      }
    }

    return {
      success: true,
      data: report,
      syncResult,
    };
  }

  /**
   * PATCH /api/reporting/reports/:id/reject
   * 신상신고서 반려
   */
  async reject(
    id: string,
    body: { reason: string },
    actor: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    if (!body.reason) {
      throw new Error('Rejection reason is required');
    }

    const report = await this.reportService.reject(id, actor, body.reason);

    return {
      success: true,
      data: report,
    };
  }

  /**
   * PATCH /api/reporting/reports/:id/request-revision
   * 수정 요청
   */
  async requestRevision(
    id: string,
    body: { reason: string },
    actor: ActorInfo
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    if (!body.reason) {
      throw new Error('Revision reason is required');
    }

    const report = await this.reportService.requestRevision(id, actor, body.reason);

    return {
      success: true,
      data: report,
    };
  }

  /**
   * GET /api/reporting/reports/stats
   * 신고서 통계
   */
  async getStats(query: { organizationId?: string; year?: string }): Promise<{
    success: boolean;
    data: any;
  }> {
    const filter: { organizationId?: string; year?: number } = {};

    if (query.organizationId) {
      filter.organizationId = query.organizationId;
    }
    if (query.year) {
      filter.year = parseInt(query.year, 10);
    }

    const stats = await this.reportService.getStatsByStatus(filter);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /api/reporting/reports/:id/sync-preview
   * 동기화 미리보기
   */
  async getSyncPreview(id: string): Promise<{
    success: boolean;
    data: any;
  }> {
    const preview = await this.syncService.previewSync(id);

    return {
      success: true,
      data: preview,
    };
  }

  /**
   * POST /api/reporting/reports/:id/sync
   * 수동 동기화
   */
  async manualSync(id: string, actor: ActorInfo): Promise<{
    success: boolean;
    data: any;
  }> {
    const result = await this.syncService.syncApprovedReport(id, actor);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/reporting/sync-all
   * 미동기화 신고서 일괄 동기화
   */
  async syncAll(actor: ActorInfo): Promise<{
    success: boolean;
    data: any;
  }> {
    const result = await this.syncService.syncAllPending(actor);

    return {
      success: true,
      data: result,
    };
  }
}
