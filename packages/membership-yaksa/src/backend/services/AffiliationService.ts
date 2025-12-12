import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { Affiliation } from '../entities/Affiliation.js';
import { Member } from '../entities/Member.js';
import { AffiliationChangeLog, AffiliationChangeType } from '../entities/AffiliationChangeLog.js';

export interface CreateAffiliationDto {
  memberId: string;
  organizationId: string;
  position: string;
  isPrimary?: boolean;
  startDate: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAffiliationDto {
  position?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

/**
 * Phase 2: 조직 변경 로그 생성 DTO
 */
export interface CreateAffiliationChangeLogDto {
  memberId: string;
  changeType: AffiliationChangeType;
  fromOrganizationId?: string;
  fromOrganizationName?: string;
  toOrganizationId?: string;
  toOrganizationName?: string;
  fromPosition?: string;
  toPosition?: string;
  fromOfficialRole?: string;
  toOfficialRole?: string;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  metadata?: Record<string, any>;
}

/**
 * Phase 2: 조직 이동 DTO
 */
export interface TransferAffiliationDto {
  memberId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  toPosition: string;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  metadata?: Record<string, any>;
}

/**
 * AffiliationService
 *
 * 회원 소속 관리 서비스
 *
 * Phase 2 확장:
 * - 조직 이동 로그 기록
 * - 주 소속 자동 할당
 * - 근무지 변경 시 조직 추천
 */
export class AffiliationService {
  private affiliationRepo: Repository<Affiliation>;
  private memberRepo: Repository<Member>;
  private changeLogRepo: Repository<AffiliationChangeLog>;

  constructor(private dataSource: DataSource) {
    this.affiliationRepo = dataSource.getRepository(Affiliation);
    this.memberRepo = dataSource.getRepository(Member);
    this.changeLogRepo = dataSource.getRepository(AffiliationChangeLog);
  }

  async create(dto: CreateAffiliationDto): Promise<Affiliation> {
    // 중복 확인
    const existing = await this.affiliationRepo.findOne({
      where: {
        memberId: dto.memberId,
        organizationId: dto.organizationId,
      },
    });
    if (existing) {
      throw new Error(
        `Affiliation already exists for member ${dto.memberId} in organization ${dto.organizationId}`
      );
    }

    // 주 소속 설정 시 기존 주 소속 해제
    if (dto.isPrimary) {
      await this.affiliationRepo.update(
        { memberId: dto.memberId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const affiliation = this.affiliationRepo.create(dto);
    return await this.affiliationRepo.save(affiliation);
  }

  async update(id: string, dto: UpdateAffiliationDto): Promise<Affiliation> {
    const affiliation = await this.findById(id);
    if (!affiliation) {
      throw new Error(`Affiliation "${id}" not found`);
    }

    // 주 소속 변경 시 기존 주 소속 해제
    if (dto.isPrimary) {
      await this.affiliationRepo.update(
        { memberId: affiliation.memberId, isPrimary: true },
        { isPrimary: false }
      );
    }

    Object.assign(affiliation, dto);
    return await this.affiliationRepo.save(affiliation);
  }

  async findById(id: string): Promise<Affiliation | null> {
    return await this.affiliationRepo.findOne({
      where: { id },
      relations: ['member'],
    });
  }

  async listByMember(memberId: string): Promise<Affiliation[]> {
    return await this.affiliationRepo.find({
      where: { memberId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async listByOrganization(organizationId: string): Promise<Affiliation[]> {
    return await this.affiliationRepo.find({
      where: { organizationId },
      relations: ['member'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<void> {
    const affiliation = await this.findById(id);
    if (!affiliation) {
      throw new Error(`Affiliation "${id}" not found`);
    }
    await this.affiliationRepo.remove(affiliation);
  }

  // ==========================================
  // Phase 2: 조직 연동 고도화 메서드
  // ==========================================

  /**
   * 주 소속 할당
   *
   * 기존 주 소속을 해제하고 새 조직을 주 소속으로 설정
   * Member.organizationId도 함께 업데이트
   *
   * @param memberId 회원 ID
   * @param organizationId 새 주 소속 조직 ID
   * @param options 추가 옵션
   */
  async assignPrimaryAffiliation(
    memberId: string,
    organizationId: string,
    options?: {
      position?: string;
      reason?: string;
      changedBy?: string;
      changedByName?: string;
      organizationName?: string;
    }
  ): Promise<{
    affiliation: Affiliation;
    changeLog: AffiliationChangeLog;
    previousOrganizationId?: string;
  }> {
    // 1. 회원 조회
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new Error(`Member "${memberId}" not found`);
    }

    // 2. 기존 주 소속 조회
    const currentPrimary = await this.affiliationRepo.findOne({
      where: { memberId, isPrimary: true },
    });

    const previousOrganizationId = currentPrimary?.organizationId || member.organizationId;

    // 3. 기존 주 소속 해제
    if (currentPrimary && currentPrimary.organizationId !== organizationId) {
      currentPrimary.isPrimary = false;
      currentPrimary.endDate = new Date().toISOString().split('T')[0];
      await this.affiliationRepo.save(currentPrimary);
    }

    // 4. 새 소속 확인 또는 생성
    let newAffiliation = await this.affiliationRepo.findOne({
      where: { memberId, organizationId },
    });

    const today = new Date().toISOString().split('T')[0];

    if (newAffiliation) {
      // 기존 소속을 주 소속으로 변경
      newAffiliation.isPrimary = true;
      newAffiliation.isActive = true;
      newAffiliation.endDate = undefined;
      if (options?.position) {
        newAffiliation.position = options.position;
      }
      newAffiliation = await this.affiliationRepo.save(newAffiliation);
    } else {
      // 새 소속 생성
      newAffiliation = await this.create({
        memberId,
        organizationId,
        position: options?.position || '평회원',
        isPrimary: true,
        startDate: today,
      });
    }

    // 5. Member.organizationId 업데이트
    member.organizationId = organizationId;
    await this.memberRepo.save(member);

    // 6. 변경 로그 기록
    const changeLog = await this.logAffiliationChange({
      memberId,
      changeType: previousOrganizationId ? 'transfer' : 'initial',
      fromOrganizationId: previousOrganizationId !== organizationId ? previousOrganizationId : undefined,
      toOrganizationId: organizationId,
      toOrganizationName: options?.organizationName,
      fromPosition: currentPrimary?.position,
      toPosition: newAffiliation.position,
      reason: options?.reason,
      changedBy: options?.changedBy,
      changedByName: options?.changedByName,
    });

    return {
      affiliation: newAffiliation,
      changeLog,
      previousOrganizationId: previousOrganizationId !== organizationId ? previousOrganizationId : undefined,
    };
  }

  /**
   * 조직 변경 로그 기록
   */
  async logAffiliationChange(dto: CreateAffiliationChangeLogDto): Promise<AffiliationChangeLog> {
    const log = this.changeLogRepo.create(dto);
    return await this.changeLogRepo.save(log);
  }

  /**
   * 회원의 조직 변경 이력 조회
   */
  async getAffiliationHistory(memberId: string): Promise<AffiliationChangeLog[]> {
    return await this.changeLogRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 조직 이동 (Transfer)
   *
   * 기존 조직에서 새 조직으로 이동하며 모든 관련 데이터를 업데이트
   */
  async transferAffiliation(dto: TransferAffiliationDto): Promise<{
    newAffiliation: Affiliation;
    oldAffiliation?: Affiliation;
    changeLog: AffiliationChangeLog;
  }> {
    const { memberId, fromOrganizationId, toOrganizationId, toPosition, reason, changedBy, changedByName, metadata } = dto;

    // 1. 회원 조회
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new Error(`Member "${memberId}" not found`);
    }

    // 2. 기존 소속 조회
    const oldAffiliation = await this.affiliationRepo.findOne({
      where: { memberId, organizationId: fromOrganizationId, isActive: true },
    });

    const fromPosition = oldAffiliation?.position;

    // 3. 기존 소속 비활성화
    if (oldAffiliation) {
      oldAffiliation.isActive = false;
      oldAffiliation.isPrimary = false;
      oldAffiliation.endDate = new Date().toISOString().split('T')[0];
      await this.affiliationRepo.save(oldAffiliation);
    }

    // 4. 새 소속 생성
    const today = new Date().toISOString().split('T')[0];
    const newAffiliation = await this.create({
      memberId,
      organizationId: toOrganizationId,
      position: toPosition,
      isPrimary: true,
      startDate: today,
    });

    // 5. Member.organizationId 업데이트
    member.organizationId = toOrganizationId;
    await this.memberRepo.save(member);

    // 6. 변경 로그 기록
    const changeLog = await this.logAffiliationChange({
      memberId,
      changeType: 'transfer',
      fromOrganizationId,
      toOrganizationId,
      fromPosition,
      toPosition,
      reason,
      changedBy,
      changedByName,
      metadata: {
        ...metadata,
        previousAffiliationId: oldAffiliation?.id,
        newAffiliationId: newAffiliation.id,
      },
    });

    return {
      newAffiliation,
      oldAffiliation: oldAffiliation || undefined,
      changeLog,
    };
  }

  /**
   * 직책 변경
   *
   * 동일 조직 내에서 직책만 변경
   */
  async changePosition(
    memberId: string,
    organizationId: string,
    newPosition: string,
    options?: {
      reason?: string;
      changedBy?: string;
      changedByName?: string;
    }
  ): Promise<{
    affiliation: Affiliation;
    changeLog: AffiliationChangeLog;
  }> {
    // 1. 소속 조회
    const affiliation = await this.affiliationRepo.findOne({
      where: { memberId, organizationId, isActive: true },
    });

    if (!affiliation) {
      throw new Error(`Active affiliation not found for member "${memberId}" in organization "${organizationId}"`);
    }

    const oldPosition = affiliation.position;

    // 2. 직책 변경
    affiliation.position = newPosition;
    const savedAffiliation = await this.affiliationRepo.save(affiliation);

    // 3. 변경 로그 기록
    const changeLog = await this.logAffiliationChange({
      memberId,
      changeType: 'position_change',
      fromOrganizationId: organizationId,
      toOrganizationId: organizationId,
      fromPosition: oldPosition,
      toPosition: newPosition,
      reason: options?.reason,
      changedBy: options?.changedBy,
      changedByName: options?.changedByName,
    });

    return {
      affiliation: savedAffiliation,
      changeLog,
    };
  }

  /**
   * 주 소속 조회
   */
  async getPrimaryAffiliation(memberId: string): Promise<Affiliation | null> {
    return await this.affiliationRepo.findOne({
      where: { memberId, isPrimary: true, isActive: true },
    });
  }

  /**
   * 특정 조직의 회원 목록 조회 (페이지네이션)
   */
  async listMembersByOrganization(
    organizationId: string,
    options?: {
      activeOnly?: boolean;
      primaryOnly?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Affiliation[]; total: number }> {
    const query = this.affiliationRepo.createQueryBuilder('affiliation')
      .leftJoinAndSelect('affiliation.member', 'member')
      .where('affiliation.organizationId = :organizationId', { organizationId });

    if (options?.activeOnly !== false) {
      query.andWhere('affiliation.isActive = true');
    }

    if (options?.primaryOnly) {
      query.andWhere('affiliation.isPrimary = true');
    }

    const total = await query.getCount();

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);
    query.orderBy('affiliation.createdAt', 'DESC');

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * 조직별 변경 이력 조회
   */
  async getOrganizationChangeHistory(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: AffiliationChangeLog[]; total: number }> {
    const query = this.changeLogRepo.createQueryBuilder('log')
      .where('log.fromOrganizationId = :organizationId OR log.toOrganizationId = :organizationId', { organizationId })
      .orderBy('log.createdAt', 'DESC');

    const total = await query.getCount();

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const data = await query.getMany();

    return { data, total };
  }
}
