import { DataSource, Repository, In } from 'typeorm';
import { AnnualReport, ReportStatus } from '../entities/AnnualReport.js';
import { ReportFieldTemplate } from '../entities/ReportFieldTemplate.js';
import { ReportLog, createReportLog } from '../entities/ReportLog.js';
import { ReportAssignment } from '../entities/ReportAssignment.js';
import { ReportTemplateService } from './ReportTemplateService.js';

/**
 * CreateReportDto
 */
export interface CreateReportDto {
  memberId: string;
  organizationId: string;
  year: number;
  fields?: Record<string, any>;
}

/**
 * UpdateReportDto
 */
export interface UpdateReportDto {
  fields?: Record<string, any>;
}

/**
 * ReportFilterDto
 */
export interface ReportFilterDto {
  memberId?: string;
  organizationId?: string;
  organizationIds?: string[];
  year?: number;
  status?: ReportStatus | ReportStatus[];
  submittedFrom?: Date;
  submittedTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * ActorInfo
 */
export interface ActorInfo {
  id: string;
  name: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * AnnualReportService
 *
 * 신상신고서 관리 서비스
 */
export class AnnualReportService {
  private reportRepo: Repository<AnnualReport>;
  private templateRepo: Repository<ReportFieldTemplate>;
  private logRepo: Repository<ReportLog>;
  private assignmentRepo: Repository<ReportAssignment>;
  private templateService: ReportTemplateService;

  constructor(private dataSource: DataSource) {
    this.reportRepo = dataSource.getRepository(AnnualReport);
    this.templateRepo = dataSource.getRepository(ReportFieldTemplate);
    this.logRepo = dataSource.getRepository(ReportLog);
    this.assignmentRepo = dataSource.getRepository(ReportAssignment);
    this.templateService = new ReportTemplateService(dataSource);
  }

  /**
   * 신고서 생성 (초안)
   */
  async create(dto: CreateReportDto, actor?: ActorInfo): Promise<AnnualReport> {
    // 중복 확인
    const existing = await this.reportRepo.findOne({
      where: { memberId: dto.memberId, year: dto.year },
    });
    if (existing) {
      throw new Error(`Report for year ${dto.year} already exists for this member`);
    }

    // 활성 템플릿 조회
    const template = await this.templateService.findActiveByYear(dto.year);
    if (!template) {
      throw new Error(`No active template found for year ${dto.year}`);
    }

    // 신고서 생성
    const report = this.reportRepo.create({
      memberId: dto.memberId,
      organizationId: dto.organizationId,
      year: dto.year,
      templateId: template.id,
      status: 'draft',
      fields: dto.fields || {},
      syncedToMembership: false,
    });

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'created', actor);

    return saved;
  }

  /**
   * 신고서 수정 (초안/수정요청 상태만)
   */
  async update(id: string, dto: UpdateReportDto, actor?: ActorInfo): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    if (!report.canEdit()) {
      throw new Error(`Report cannot be edited in status: ${report.status}`);
    }

    // 이전 필드값 저장 (로그용)
    const previousFields = { ...report.fields };

    // 필드 업데이트
    if (dto.fields) {
      report.fields = {
        ...report.fields,
        ...dto.fields,
      };
    }

    const saved = await this.reportRepo.save(report);

    // 변경된 필드 계산
    const changedFields: Record<string, { from: any; to: any }> = {};
    if (dto.fields) {
      for (const [key, value] of Object.entries(dto.fields)) {
        if (previousFields[key] !== value) {
          changedFields[key] = { from: previousFields[key], to: value };
        }
      }
    }

    // 로그 기록
    if (Object.keys(changedFields).length > 0) {
      await this.createLog(saved.id, 'updated', actor, { changedFields });
    }

    return saved;
  }

  /**
   * 신고서 제출
   */
  async submit(id: string, actor?: ActorInfo): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['template'],
    });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    if (!report.canSubmit()) {
      throw new Error(`Report cannot be submitted in status: ${report.status}`);
    }

    // 필수 필드 검증
    if (report.template) {
      this.validateRequiredFields(report.fields, report.template.fields);
    }

    const previousStatus = report.status;
    report.status = 'submitted';
    report.submittedAt = new Date();

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'submitted', actor, {
      previousStatus,
      newStatus: 'submitted',
    });

    return saved;
  }

  /**
   * 신고서 승인
   */
  async approve(
    id: string,
    actor: ActorInfo,
    comment?: string
  ): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    if (!report.canReview()) {
      throw new Error(`Report cannot be approved in status: ${report.status}`);
    }

    const previousStatus = report.status;
    report.status = 'approved';
    report.approvedAt = new Date();
    report.approvedBy = actor.id;
    if (comment) {
      report.adminNotes = comment;
    }

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'approved', actor, {
      previousStatus,
      newStatus: 'approved',
      comment,
    });

    return saved;
  }

  /**
   * 신고서 반려
   */
  async reject(
    id: string,
    actor: ActorInfo,
    reason: string
  ): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    if (!report.canReview()) {
      throw new Error(`Report cannot be rejected in status: ${report.status}`);
    }

    const previousStatus = report.status;
    report.status = 'rejected';
    report.rejectedAt = new Date();
    report.rejectedBy = actor.id;
    report.rejectedReason = reason;

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'rejected', actor, {
      previousStatus,
      newStatus: 'rejected',
      reason,
    });

    return saved;
  }

  /**
   * 수정 요청
   */
  async requestRevision(
    id: string,
    actor: ActorInfo,
    reason: string
  ): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    if (!report.canReview()) {
      throw new Error(`Report cannot be revision-requested in status: ${report.status}`);
    }

    const previousStatus = report.status;
    report.status = 'revision_requested';
    report.revisionReason = reason;

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'revision_requested', actor, {
      previousStatus,
      newStatus: 'revision_requested',
      reason,
    });

    return saved;
  }

  /**
   * 신고서 조회 (ID)
   */
  async findById(id: string): Promise<AnnualReport | null> {
    return await this.reportRepo.findOne({
      where: { id },
      relations: ['template', 'logs', 'assignments'],
    });
  }

  /**
   * 회원의 특정 연도 신고서 조회
   */
  async findByMemberAndYear(memberId: string, year: number): Promise<AnnualReport | null> {
    return await this.reportRepo.findOne({
      where: { memberId, year },
      relations: ['template', 'logs'],
    });
  }

  /**
   * 회원의 모든 신고서 조회
   */
  async findByMember(memberId: string): Promise<AnnualReport[]> {
    return await this.reportRepo.find({
      where: { memberId },
      relations: ['template'],
      order: { year: 'DESC' },
    });
  }

  /**
   * 신고서 목록 조회 (필터링)
   */
  async list(filter?: ReportFilterDto): Promise<{ data: AnnualReport[]; total: number }> {
    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.template', 'template');

    // 필터 적용
    if (filter?.memberId) {
      qb.andWhere('report.memberId = :memberId', { memberId: filter.memberId });
    }

    if (filter?.organizationId) {
      qb.andWhere('report.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter?.organizationIds?.length) {
      qb.andWhere('report.organizationId IN (:...organizationIds)', {
        organizationIds: filter.organizationIds,
      });
    }

    if (filter?.year) {
      qb.andWhere('report.year = :year', { year: filter.year });
    }

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        qb.andWhere('report.status IN (:...statuses)', { statuses: filter.status });
      } else {
        qb.andWhere('report.status = :status', { status: filter.status });
      }
    }

    if (filter?.submittedFrom) {
      qb.andWhere('report.submittedAt >= :submittedFrom', {
        submittedFrom: filter.submittedFrom,
      });
    }

    if (filter?.submittedTo) {
      qb.andWhere('report.submittedAt <= :submittedTo', {
        submittedTo: filter.submittedTo,
      });
    }

    // 전체 카운트
    const total = await qb.getCount();

    // 정렬
    qb.orderBy('report.year', 'DESC')
      .addOrderBy('report.submittedAt', 'DESC');

    // 페이지네이션
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();

    return { data, total };
  }

  /**
   * 상태별 통계
   */
  async getStatsByStatus(filter?: { organizationId?: string; year?: number }): Promise<Record<ReportStatus, number>> {
    const qb = this.reportRepo.createQueryBuilder('report')
      .select('report.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.status');

    if (filter?.organizationId) {
      qb.andWhere('report.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter?.year) {
      qb.andWhere('report.year = :year', { year: filter.year });
    }

    const results = await qb.getRawMany();

    const stats: Record<string, number> = {
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      revision_requested: 0,
    };

    for (const row of results) {
      stats[row.status] = parseInt(row.count, 10);
    }

    return stats as Record<ReportStatus, number>;
  }

  /**
   * Membership-Yaksa 동기화 표시
   */
  async markSynced(
    id: string,
    changes: Record<string, { from: any; to: any }>,
    actor?: ActorInfo
  ): Promise<AnnualReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new Error(`Report "${id}" not found`);
    }

    report.syncedToMembership = true;
    report.syncedAt = new Date();
    report.syncedChanges = changes;

    const saved = await this.reportRepo.save(report);

    // 로그 기록
    await this.createLog(saved.id, 'synced', actor, {
      syncedFields: Object.keys(changes),
      changes,
    });

    return saved;
  }

  /**
   * 로그 기록
   */
  private async createLog(
    reportId: string,
    action: ReportLog['action'],
    actor?: ActorInfo,
    data?: Record<string, any>
  ): Promise<ReportLog> {
    const log = this.logRepo.create(
      createReportLog(reportId, action, {
        actorId: actor?.id,
        actorName: actor?.name,
        actorRole: actor?.role,
        data,
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      })
    );

    return await this.logRepo.save(log);
  }

  /**
   * 필수 필드 검증
   */
  private validateRequiredFields(
    fields: Record<string, any>,
    definitions: ReportFieldTemplate['fields']
  ): void {
    const errors: string[] = [];

    for (const def of definitions) {
      if (def.required && !def.readonly) {
        const value = fields[def.key];
        if (value === undefined || value === null || value === '') {
          errors.push(`${def.label}(${def.key}) is required`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * 신고서 로그 조회
   */
  async getLogs(reportId: string): Promise<ReportLog[]> {
    return await this.logRepo.find({
      where: { reportId },
      order: { createdAt: 'DESC' },
    });
  }
}
