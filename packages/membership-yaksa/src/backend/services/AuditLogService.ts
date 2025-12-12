import { DataSource, Repository } from 'typeorm';
import { MemberAuditLog, AuditAction, FieldChange } from '../entities/MemberAuditLog.js';
import { Member } from '../entities/Member.js';

/**
 * 필드 라벨 매핑
 */
const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  birthdate: '생년월일',
  gender: '성별',
  phone: '연락처',
  email: '이메일',
  licenseNumber: '면허번호',
  licenseIssuedAt: '면허 발급일',
  licenseRenewalAt: '면허 갱신일',
  pharmacistType: '약사 유형',
  workplaceName: '근무지명',
  workplaceAddress: '근무지 주소',
  workplaceType: '근무지 유형',
  pharmacyName: '약국명',
  pharmacyAddress: '약국 주소',
  organizationId: '소속 조직',
  officialRole: '공식 직책',
  categoryId: '회원 카테고리',
  isVerified: '검증 상태',
  isActive: '활성 상태',
  yaksaJoinDate: '약사회 가입일',
  registrationNumber: '회원등록번호',
  memo: '메모',
  metadata: '메타데이터',
};

/**
 * CreateAuditLogDto
 */
export interface CreateAuditLogDto {
  memberId: string;
  action: AuditAction;
  actionDescription?: string;
  changedFields?: FieldChange[];
  previousSnapshot?: Record<string, any>;
  newSnapshot?: Record<string, any>;
  changedBy?: string;
  changedByName?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * AuditLogFilterDto
 */
export interface AuditLogFilterDto {
  memberId?: string;
  action?: AuditAction;
  changedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

/**
 * AuditLogService
 *
 * Phase 2: 회원 변경 이력(Audit Log) 서비스
 *
 * 회원 정보 변경을 추적하고 감사 로그를 생성합니다.
 */
export class AuditLogService {
  private auditLogRepo: Repository<MemberAuditLog>;
  private memberRepo: Repository<Member>;

  constructor(private dataSource: DataSource) {
    this.auditLogRepo = dataSource.getRepository(MemberAuditLog);
    this.memberRepo = dataSource.getRepository(Member);
  }

  /**
   * 감사 로그 생성
   */
  async create(dto: CreateAuditLogDto): Promise<MemberAuditLog> {
    const log = this.auditLogRepo.create(dto);
    return await this.auditLogRepo.save(log);
  }

  /**
   * ID로 감사 로그 조회
   */
  async findById(id: string): Promise<MemberAuditLog | null> {
    return await this.auditLogRepo.findOne({
      where: { id },
    });
  }

  /**
   * 회원별 감사 로그 조회
   */
  async findByMember(
    memberId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ data: MemberAuditLog[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepo.findAndCount({
      where: { memberId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * 감사 로그 목록 조회 (필터링)
   */
  async list(filter?: AuditLogFilterDto): Promise<{ data: MemberAuditLog[]; total: number }> {
    const query = this.auditLogRepo.createQueryBuilder('log');

    if (filter?.memberId) {
      query.andWhere('log.memberId = :memberId', { memberId: filter.memberId });
    }

    if (filter?.action) {
      query.andWhere('log.action = :action', { action: filter.action });
    }

    if (filter?.changedBy) {
      query.andWhere('log.changedBy = :changedBy', { changedBy: filter.changedBy });
    }

    if (filter?.dateFrom && filter?.dateTo) {
      query.andWhere('log.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    } else if (filter?.dateFrom) {
      query.andWhere('log.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    } else if (filter?.dateTo) {
      query.andWhere('log.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    const total = await query.getCount();

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    query.orderBy('log.createdAt', 'DESC');
    query.skip(skip).take(limit);

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * 두 객체 간의 차이점 계산
   *
   * 회원 정보 업데이트 시 변경된 필드를 감지합니다.
   */
  computeDiff(oldData: Partial<Member>, newData: Partial<Member>): FieldChange[] {
    const changes: FieldChange[] = [];
    const fieldsToTrack = Object.keys(FIELD_LABELS);

    for (const field of fieldsToTrack) {
      const oldValue = (oldData as any)[field];
      const newValue = (newData as any)[field];

      // 값이 변경된 경우에만 기록
      if (!this.isEqual(oldValue, newValue)) {
        changes.push({
          field,
          oldValue: this.serializeValue(oldValue),
          newValue: this.serializeValue(newValue),
          label: FIELD_LABELS[field],
        });
      }
    }

    return changes;
  }

  /**
   * 두 값이 같은지 비교
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null && b === undefined) return true;
    if (a === undefined && b === null) return true;
    if (a === '' && (b === null || b === undefined)) return true;
    if ((a === null || a === undefined) && b === '') return true;

    // 객체 비교
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * 값 직렬화 (로그 저장용)
   */
  private serializeValue(value: any): any {
    if (value === undefined || value === null) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.parse(JSON.stringify(value));
    }

    return value;
  }

  /**
   * 회원 생성 로그 기록
   */
  async logCreate(
    member: Member,
    options?: {
      changedBy?: string;
      changedByName?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId: member.id,
      action: 'create',
      actionDescription: '회원 생성',
      newSnapshot: this.createSnapshot(member),
      ...options,
    });
  }

  /**
   * 회원 수정 로그 기록
   */
  async logUpdate(
    memberId: string,
    oldMember: Partial<Member>,
    newMember: Partial<Member>,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog | null> {
    const changedFields = this.computeDiff(oldMember, newMember);

    // 변경 사항이 없으면 로그 생성 안함
    if (changedFields.length === 0) {
      return null;
    }

    // 변경 내용 설명 생성
    const fieldNames = changedFields.map(f => f.label || f.field).join(', ');
    const actionDescription = `회원 정보 수정: ${fieldNames}`;

    return await this.create({
      memberId,
      action: 'update',
      actionDescription,
      changedFields,
      previousSnapshot: this.createSnapshot(oldMember),
      newSnapshot: this.createSnapshot(newMember),
      ...options,
    });
  }

  /**
   * 회원 삭제 로그 기록
   */
  async logDelete(
    member: Member,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId: member.id,
      action: 'delete',
      actionDescription: '회원 삭제',
      previousSnapshot: this.createSnapshot(member),
      ...options,
    });
  }

  /**
   * 검증 상태 변경 로그 기록
   */
  async logVerificationChange(
    memberId: string,
    oldValue: boolean,
    newValue: boolean,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId,
      action: 'verify',
      actionDescription: newValue ? '회원 검증 승인' : '회원 검증 취소',
      changedFields: [
        {
          field: 'isVerified',
          oldValue,
          newValue,
          label: '검증 상태',
        },
      ],
      ...options,
    });
  }

  /**
   * 활성 상태 변경 로그 기록
   */
  async logActivationChange(
    memberId: string,
    oldValue: boolean,
    newValue: boolean,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId,
      action: newValue ? 'activate' : 'deactivate',
      actionDescription: newValue ? '회원 활성화' : '회원 비활성화',
      changedFields: [
        {
          field: 'isActive',
          oldValue,
          newValue,
          label: '활성 상태',
        },
      ],
      ...options,
    });
  }

  /**
   * 역할 변경 로그 기록
   */
  async logRoleChange(
    memberId: string,
    oldRole: string | undefined,
    newRole: string,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId,
      action: 'role_change',
      actionDescription: `직책 변경: ${oldRole || '없음'} → ${newRole}`,
      changedFields: [
        {
          field: 'officialRole',
          oldValue: oldRole || null,
          newValue: newRole,
          label: '공식 직책',
        },
      ],
      ...options,
    });
  }

  /**
   * 카테고리 변경 로그 기록
   */
  async logCategoryChange(
    memberId: string,
    oldCategoryId: string | undefined,
    newCategoryId: string,
    options?: {
      oldCategoryName?: string;
      newCategoryName?: string;
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog> {
    return await this.create({
      memberId,
      action: 'category_change',
      actionDescription: `회원 카테고리 변경`,
      changedFields: [
        {
          field: 'categoryId',
          oldValue: oldCategoryId || null,
          newValue: newCategoryId,
          label: '회원 카테고리',
        },
      ],
      metadata: {
        oldCategoryName: options?.oldCategoryName,
        newCategoryName: options?.newCategoryName,
      },
      ...options,
    });
  }

  /**
   * 일괄 업데이트 로그 기록
   */
  async logBulkUpdate(
    memberIds: string[],
    updateFields: Record<string, any>,
    options?: {
      changedBy?: string;
      changedByName?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<MemberAuditLog[]> {
    const logs: MemberAuditLog[] = [];

    const fieldNames = Object.keys(updateFields)
      .map(f => FIELD_LABELS[f] || f)
      .join(', ');

    for (const memberId of memberIds) {
      const log = await this.create({
        memberId,
        action: 'bulk_update',
        actionDescription: `일괄 업데이트: ${fieldNames}`,
        metadata: {
          bulkUpdateFields: updateFields,
          totalMembers: memberIds.length,
        },
        ...options,
      });
      logs.push(log);
    }

    return logs;
  }

  /**
   * 최근 변경 이력 조회 (전체)
   */
  async getRecentLogs(
    options?: {
      limit?: number;
      action?: AuditAction;
    }
  ): Promise<MemberAuditLog[]> {
    const query = this.auditLogRepo.createQueryBuilder('log');

    if (options?.action) {
      query.andWhere('log.action = :action', { action: options.action });
    }

    query.orderBy('log.createdAt', 'DESC');
    query.take(options?.limit || 50);

    return await query.getMany();
  }

  /**
   * 특정 기간 변경 통계
   */
  async getChangeStats(
    dateFrom: Date,
    dateTo: Date,
    organizationId?: string
  ): Promise<{
    totalChanges: number;
    byAction: Record<AuditAction, number>;
    byChangedBy: Array<{ userId: string; name?: string; count: number }>;
  }> {
    const baseQuery = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoin('log.member', 'member')
      .where('log.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });

    if (organizationId) {
      baseQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    // 총 변경 수
    const totalChanges = await baseQuery.clone().getCount();

    // 액션별 통계
    const actionStatsRaw = await baseQuery
      .clone()
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    const byAction: Record<string, number> = {};
    for (const row of actionStatsRaw) {
      byAction[row.action] = parseInt(row.count, 10);
    }

    // 변경자별 통계
    const changedByStatsRaw = await baseQuery
      .clone()
      .select('log.changedBy', 'userId')
      .addSelect('log.changedByName', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('log.changedBy IS NOT NULL')
      .groupBy('log.changedBy')
      .addGroupBy('log.changedByName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byChangedBy = changedByStatsRaw.map(row => ({
      userId: row.userId,
      name: row.name,
      count: parseInt(row.count, 10),
    }));

    return {
      totalChanges,
      byAction: byAction as Record<AuditAction, number>,
      byChangedBy,
    };
  }

  /**
   * Member 객체의 스냅샷 생성
   */
  private createSnapshot(member: Partial<Member>): Record<string, any> {
    const snapshot: Record<string, any> = {};

    for (const field of Object.keys(FIELD_LABELS)) {
      const value = (member as any)[field];
      if (value !== undefined) {
        snapshot[field] = this.serializeValue(value);
      }
    }

    return snapshot;
  }
}
