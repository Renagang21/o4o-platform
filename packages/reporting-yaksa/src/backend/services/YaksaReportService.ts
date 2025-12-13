import { DataSource, Repository } from 'typeorm';
import {
  YaksaReport,
  YaksaReportType,
  YaksaReportStatus,
} from '../entities/YaksaReport.js';
import {
  YaksaReportHistory,
  YaksaReportAction,
} from '../entities/YaksaReportHistory.js';

/**
 * 신고서 생성 입력
 */
export interface CreateReportFromPostInput {
  postId: string;
  memberId: string;
  reportType: YaksaReportType;
  payload: Record<string, any>;
  confidence: number;
  triggerSnapshot?: Record<string, any>;
  memberSnapshot?: Record<string, any>;
}

/**
 * 신고서 수정 입력
 */
export interface UpdateReportInput {
  payload?: Record<string, any>;
  operatorNotes?: string;
}

/**
 * 신고서 목록 조회 옵션
 */
export interface ListReportsOptions {
  status?: YaksaReportStatus | YaksaReportStatus[];
  reportType?: YaksaReportType;
  memberId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'confidence' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 신고서 목록 응답
 */
export interface ListReportsResult {
  items: YaksaReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 액터 정보
 */
export interface Actor {
  id: string;
  name: string;
  role?: string;
}

// DataSource 의존성 주입
let AppDataSource: DataSource;

/**
 * 서비스 초기화
 */
export function initYaksaReportService(dataSource: DataSource): void {
  AppDataSource = dataSource;
}

/**
 * YaksaReportService
 *
 * forum-yaksa RPA 기반 신고서 관리 서비스
 */
export class YaksaReportService {
  private get reportRepository(): Repository<YaksaReport> {
    return AppDataSource.getRepository(YaksaReport);
  }

  private get historyRepository(): Repository<YaksaReportHistory> {
    return AppDataSource.getRepository(YaksaReportHistory);
  }

  /**
   * forum 게시글로부터 신고서 초안 생성
   */
  async createDraftFromForumPost(
    input: CreateReportFromPostInput
  ): Promise<YaksaReport> {
    // 이미 동일 게시글에서 생성된 신고서가 있는지 확인
    const existing = await this.reportRepository.findOne({
      where: { sourcePostId: input.postId },
    });

    if (existing) {
      throw new Error(`Report already exists for post: ${input.postId}`);
    }

    // 신고서 생성
    const report = this.reportRepository.create({
      memberId: input.memberId,
      reportType: input.reportType,
      sourcePostId: input.postId,
      status: 'DRAFT',
      payload: input.payload,
      confidence: input.confidence,
      triggerSnapshot: input.triggerSnapshot,
      memberSnapshot: input.memberSnapshot,
    });

    const savedReport = await this.reportRepository.save(report);

    // 생성 이력 기록
    await this.createHistory(savedReport.id, {
      action: 'CREATED',
      newStatus: 'DRAFT',
      details: {
        source: 'forum_rpa_trigger',
        postId: input.postId,
        confidence: input.confidence,
      },
    });

    return savedReport;
  }

  /**
   * 상태별 신고서 목록 조회
   */
  async getReportsByStatus(
    options: ListReportsOptions = {}
  ): Promise<ListReportsResult> {
    const {
      status,
      reportType,
      memberId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.history', 'history');

    // 상태 필터
    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('report.status IN (:...statuses)', {
          statuses: status,
        });
      } else {
        queryBuilder.andWhere('report.status = :status', { status });
      }
    }

    // 유형 필터
    if (reportType) {
      queryBuilder.andWhere('report.reportType = :reportType', { reportType });
    }

    // 회원 필터
    if (memberId) {
      queryBuilder.andWhere('report.memberId = :memberId', { memberId });
    }

    // 정렬
    queryBuilder.orderBy(`report.${sortBy}`, sortOrder);

    // 페이지네이션
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 신고서 상세 조회
   */
  async getReportDetail(reportId: string): Promise<YaksaReport | null> {
    return this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['history'],
      order: {
        history: {
          createdAt: 'DESC',
        },
      },
    });
  }

  /**
   * 게시글 ID로 신고서 조회
   */
  async getReportByPostId(postId: string): Promise<YaksaReport | null> {
    return this.reportRepository.findOne({
      where: { sourcePostId: postId },
      relations: ['history'],
    });
  }

  /**
   * 신고서 초안 수정
   */
  async updateDraft(
    reportId: string,
    input: UpdateReportInput,
    actor: Actor,
    ipAddress?: string
  ): Promise<YaksaReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (!report.canEdit()) {
      throw new Error(`Report cannot be edited in status: ${report.status}`);
    }

    const previousPayload = { ...report.payload };
    const previousStatus = report.status;

    // 업데이트
    if (input.payload) {
      report.payload = input.payload;
    }
    if (input.operatorNotes !== undefined) {
      report.operatorNotes = input.operatorNotes;
    }

    // 검토 상태로 변경
    if (report.status === 'DRAFT') {
      report.status = 'REVIEWED';
      report.reviewedBy = actor.id;
      report.reviewedAt = new Date();
    }

    const savedReport = await this.reportRepository.save(report);

    // 수정 이력 기록
    await this.createHistory(reportId, {
      action: report.status === 'REVIEWED' ? 'REVIEWED' : 'EDITED',
      previousStatus,
      newStatus: report.status,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      previousPayload,
      newPayload: report.payload,
      ipAddress,
    });

    return savedReport;
  }

  /**
   * 신고서 승인
   */
  async approveReport(
    reportId: string,
    actor: Actor,
    ipAddress?: string
  ): Promise<YaksaReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (!report.canApproveOrReject()) {
      throw new Error(`Report cannot be approved in status: ${report.status}`);
    }

    const previousStatus = report.status;

    report.status = 'APPROVED';
    report.approvedBy = actor.id;
    report.approvedAt = new Date();

    const savedReport = await this.reportRepository.save(report);

    // 승인 이력 기록
    await this.createHistory(reportId, {
      action: 'APPROVED',
      previousStatus,
      newStatus: 'APPROVED',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      ipAddress,
    });

    return savedReport;
  }

  /**
   * 신고서 반려
   */
  async rejectReport(
    reportId: string,
    reason: string,
    actor: Actor,
    ipAddress?: string
  ): Promise<YaksaReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (!report.canApproveOrReject()) {
      throw new Error(`Report cannot be rejected in status: ${report.status}`);
    }

    const previousStatus = report.status;

    report.status = 'REJECTED';
    report.rejectionReason = reason;

    const savedReport = await this.reportRepository.save(report);

    // 반려 이력 기록
    await this.createHistory(reportId, {
      action: 'REJECTED',
      previousStatus,
      newStatus: 'REJECTED',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      details: { reason },
      ipAddress,
    });

    return savedReport;
  }

  /**
   * 대시보드 통계
   */
  async getDashboardStats(): Promise<{
    totalDraft: number;
    totalReviewed: number;
    totalApproved: number;
    totalRejected: number;
    recentReports: YaksaReport[];
  }> {
    const [totalDraft, totalReviewed, totalApproved, totalRejected] =
      await Promise.all([
        this.reportRepository.count({ where: { status: 'DRAFT' } }),
        this.reportRepository.count({ where: { status: 'REVIEWED' } }),
        this.reportRepository.count({ where: { status: 'APPROVED' } }),
        this.reportRepository.count({ where: { status: 'REJECTED' } }),
      ]);

    const recentReports = await this.reportRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalDraft,
      totalReviewed,
      totalApproved,
      totalRejected,
      recentReports,
    };
  }

  /**
   * 이력 기록 헬퍼
   */
  private async createHistory(
    reportId: string,
    data: Partial<YaksaReportHistory>
  ): Promise<YaksaReportHistory> {
    const history = this.historyRepository.create({
      reportId,
      ...data,
    });
    return this.historyRepository.save(history);
  }
}

// 싱글톤 인스턴스
export const yaksaReportService = new YaksaReportService();
