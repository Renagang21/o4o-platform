import { DataSource, Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import {
  Member,
  PharmacistType,
  WorkplaceType,
  OfficialRole,
  Gender,
} from '../entities/Member.js';
import { MemberCategory } from '../entities/MemberCategory.js';
import { MembershipYear } from '../entities/MembershipYear.js';
import { Verification } from '../entities/Verification.js';
import { RoleAssignmentService, MembershipRole } from './RoleAssignmentService.js';

/**
 * ComputedMemberStatus
 *
 * 회원의 계산된 상태 정보
 */
export interface ComputedMemberStatus {
  isVerified: boolean; // 검증 여부 (최신 verification 기록 기반)
  isActive: boolean; // 활성 여부
  membershipType: string; // 회원 유형 (카테고리 이름)
  feeStatus: 'paid' | 'unpaid' | 'not_required'; // 연회비 납부 상태 (현재 연도 기준)
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'none'; // 최근 검증 상태
  lastVerificationDate?: Date; // 마지막 검증 일자
  currentYearFee?: {
    year: number;
    paid: boolean;
    amount?: number;
    paidAt?: Date;
  };
  // Phase 1: 약사 정보
  pharmacistType?: PharmacistType;
  workplaceType?: WorkplaceType;
  isExecutive: boolean; // 임원 여부
  officialRole?: OfficialRole;
}

/**
 * CreateMemberDto
 */
export interface CreateMemberDto {
  userId: string;
  organizationId: string;
  licenseNumber: string;
  name: string;
  birthdate: string;
  categoryId?: string;
  phone?: string;
  email?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  metadata?: Record<string, any>;
  // Phase 1: 확장 필드
  gender?: Gender;
  licenseIssuedAt?: string;
  licenseRenewalAt?: string;
  pharmacistType?: PharmacistType;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: WorkplaceType;
  yaksaJoinDate?: string;
  officialRole?: OfficialRole;
  registrationNumber?: string;
  memo?: string;
}

/**
 * UpdateMemberDto
 */
export interface UpdateMemberDto {
  organizationId?: string;
  name?: string;
  birthdate?: string;
  categoryId?: string;
  phone?: string;
  email?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  isVerified?: boolean;
  isActive?: boolean;
  metadata?: Record<string, any>;
  // Phase 1: 확장 필드
  gender?: Gender;
  licenseIssuedAt?: string;
  licenseRenewalAt?: string;
  pharmacistType?: PharmacistType;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: WorkplaceType;
  yaksaJoinDate?: string;
  officialRole?: OfficialRole;
  registrationNumber?: string;
  memo?: string;
}

/**
 * MemberFilterDto
 */
export interface MemberFilterDto {
  organizationId?: string;
  categoryId?: string;
  isVerified?: boolean;
  isActive?: boolean;
  licenseNumber?: string;
  name?: string;
  search?: string; // 이름 또는 면허번호 통합 검색
  year?: number; // 연회비 연도
  paid?: boolean; // 연회비 납부 여부
  verificationStatus?: 'pending' | 'approved' | 'rejected'; // 검증 상태
  createdFrom?: Date; // 가입일 시작
  createdTo?: Date; // 가입일 종료
  page?: number; // 페이지 번호
  limit?: number; // 페이지당 항목 수
  // Phase 1: 확장 필터
  pharmacistType?: PharmacistType;
  workplaceType?: WorkplaceType;
  officialRole?: OfficialRole;
  gender?: Gender;
  isExecutive?: boolean; // 임원 여부
  registrationNumber?: string;
}

/**
 * RoleSyncResult
 *
 * 역할 동기화 결과
 */
export interface RoleSyncResult {
  memberId: string;
  previousRole?: MembershipRole;
  newRole: MembershipRole;
  deactivated: number;
}

/**
 * MemberService
 *
 * 회원 관리 서비스
 *
 * Phase 2: officialRole 변경 시 자동 역할 동기화 기능 추가
 */
export class MemberService {
  private memberRepo: Repository<Member>;
  private categoryRepo: Repository<MemberCategory>;
  private roleAssignmentService: RoleAssignmentService;

  constructor(private dataSource: DataSource) {
    this.memberRepo = dataSource.getRepository(Member);
    this.categoryRepo = dataSource.getRepository(MemberCategory);
    this.roleAssignmentService = new RoleAssignmentService(dataSource);
  }

  /**
   * RoleAssignmentService 인스턴스 반환
   */
  getRoleAssignmentService(): RoleAssignmentService {
    return this.roleAssignmentService;
  }

  /**
   * 회원 생성
   */
  async create(dto: CreateMemberDto): Promise<Member> {
    // 1. 중복 확인 (userId, licenseNumber)
    const existingByUser = await this.memberRepo.findOne({
      where: { userId: dto.userId },
    });
    if (existingByUser) {
      throw new Error(`Member already exists for user: ${dto.userId}`);
    }

    const existingByLicense = await this.memberRepo.findOne({
      where: { licenseNumber: dto.licenseNumber },
    });
    if (existingByLicense) {
      throw new Error(
        `Member already exists with license number: ${dto.licenseNumber}`
      );
    }

    // 2. Category 존재 확인
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new Error(`Category "${dto.categoryId}" not found`);
      }
    }

    // 3. 회원 생성
    const member = this.memberRepo.create(dto);
    return await this.memberRepo.save(member);
  }

  /**
   * 회원 수정
   *
   * Phase 2: officialRole 변경 시 자동 역할 동기화
   *
   * @param id 회원 ID
   * @param dto 업데이트 데이터
   * @param updatedBy 변경자 ID (역할 동기화 기록용)
   * @returns 업데이트된 회원 정보. roleSyncResult가 있으면 역할 동기화가 수행됨
   */
  async update(
    id: string,
    dto: UpdateMemberDto,
    updatedBy?: string
  ): Promise<{ member: Member; roleSyncResult?: RoleSyncResult }> {
    const member = await this.findById(id);
    if (!member) {
      throw new Error(`Member "${id}" not found`);
    }

    // Category 변경 시 존재 확인
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new Error(`Category "${dto.categoryId}" not found`);
      }
    }

    // Phase 2: officialRole 변경 감지
    const oldOfficialRole = member.officialRole;
    const newOfficialRole = dto.officialRole;
    const officialRoleChanged =
      newOfficialRole !== undefined && newOfficialRole !== oldOfficialRole;

    Object.assign(member, dto);
    const savedMember = await this.memberRepo.save(member);

    // Phase 2: officialRole 변경 시 역할 자동 동기화
    let roleSyncResult: RoleSyncResult | undefined;
    if (officialRoleChanged && newOfficialRole) {
      const syncResult = await this.roleAssignmentService.syncRoleFromOfficialRole(
        member.id,
        newOfficialRole,
        member.organizationId,
        oldOfficialRole,
        updatedBy
      );

      roleSyncResult = {
        memberId: member.id,
        previousRole: syncResult.previousRole,
        newRole: syncResult.newRole,
        deactivated: syncResult.deactivated,
      };
    }

    return { member: savedMember, roleSyncResult };
  }

  /**
   * 회원 조회 (ID)
   * Phase P0 Task D: Enriched with User data (name/phone/email)
   */
  async findById(id: string): Promise<Member | null> {
    const member = await this.memberRepo.findOne({
      where: { id },
      relations: ['category', 'affiliations', 'membershipYears', 'verifications'],
    });
    if (!member) return null;
    const [enriched] = await this.enrichMembersWithUserData([member]);
    return enriched;
  }

  /**
   * 회원 조회 (User ID)
   * Phase P0 Task D: Enriched with User data (name/phone/email)
   */
  async findByUserId(userId: string): Promise<Member | null> {
    const member = await this.memberRepo.findOne({
      where: { userId },
      relations: ['category', 'affiliations', 'membershipYears', 'verifications'],
    });
    if (!member) return null;
    const [enriched] = await this.enrichMembersWithUserData([member]);
    return enriched;
  }

  /**
   * 회원 조회 (면허번호)
   * Phase P0 Task D: Enriched with User data (name/phone/email)
   */
  async findByLicenseNumber(licenseNumber: string): Promise<Member | null> {
    const member = await this.memberRepo.findOne({
      where: { licenseNumber },
      relations: ['category'],
    });
    if (!member) return null;
    const [enriched] = await this.enrichMembersWithUserData([member]);
    return enriched;
  }

  /**
   * Phase P0 Task D: Enrich members with User data
   * Fetches user name/phone/email from users table and merges into member results
   */
  private async enrichMembersWithUserData(members: Member[]): Promise<Member[]> {
    if (members.length === 0) return members;

    const userIds = members.map(m => m.userId).filter(Boolean);
    if (userIds.length === 0) return members;

    try {
      // Query users table directly
      const users = await this.dataSource.query(`
        SELECT id, name, email, phone
        FROM users
        WHERE id = ANY($1)
      `, [userIds]);

      // Create a map for quick lookup
      const userMap = new Map<string, { name?: string; email?: string; phone?: string }>();
      for (const user of users) {
        userMap.set(user.id, { name: user.name, email: user.email, phone: user.phone });
      }

      // Enrich members with user data
      // Priority: User data > Member data (for backward compatibility during transition)
      for (const member of members) {
        const userData = userMap.get(member.userId);
        if (userData) {
          // Store original member values in metadata for debugging if needed
          if (!member.metadata) member.metadata = {};
          member.metadata._memberName = member.name;
          member.metadata._memberEmail = member.email;
          member.metadata._memberPhone = member.phone;

          // Override with user data if available
          if (userData.name) member.name = userData.name;
          if (userData.email) member.email = userData.email;
          if (userData.phone) member.phone = userData.phone;
        }
      }
    } catch (error) {
      // Log error but don't fail - member data is still available
      console.warn('[MemberService] Failed to enrich members with user data:', error);
    }

    return members;
  }

  /**
   * 회원 목록 조회 (고급 필터링 지원)
   *
   * Phase P0 Task D: Results are enriched with User data (name/phone/email)
   */
  async list(filter?: MemberFilterDto): Promise<{ data: Member[]; total: number }> {
    const queryBuilder = this.memberRepo.createQueryBuilder('member')
      .leftJoinAndSelect('member.category', 'category')
      .leftJoinAndSelect('member.membershipYears', 'membershipYear')
      .leftJoinAndSelect('member.verifications', 'verification');

    // 기본 필터
    if (filter?.organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter?.categoryId) {
      queryBuilder.andWhere('member.categoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter?.isVerified !== undefined) {
      queryBuilder.andWhere('member.isVerified = :isVerified', {
        isVerified: filter.isVerified,
      });
    }

    if (filter?.isActive !== undefined) {
      queryBuilder.andWhere('member.isActive = :isActive', {
        isActive: filter.isActive,
      });
    }

    // 통합 검색 (이름 또는 면허번호)
    if (filter?.search) {
      queryBuilder.andWhere(
        '(member.name LIKE :search OR member.licenseNumber LIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // 개별 검색
    if (filter?.name) {
      queryBuilder.andWhere('member.name LIKE :name', {
        name: `%${filter.name}%`,
      });
    }

    if (filter?.licenseNumber) {
      queryBuilder.andWhere('member.licenseNumber LIKE :licenseNumber', {
        licenseNumber: `%${filter.licenseNumber}%`,
      });
    }

    // 가입일 범위 필터
    if (filter?.createdFrom && filter?.createdTo) {
      queryBuilder.andWhere('member.createdAt BETWEEN :createdFrom AND :createdTo', {
        createdFrom: filter.createdFrom,
        createdTo: filter.createdTo,
      });
    } else if (filter?.createdFrom) {
      queryBuilder.andWhere('member.createdAt >= :createdFrom', {
        createdFrom: filter.createdFrom,
      });
    } else if (filter?.createdTo) {
      queryBuilder.andWhere('member.createdAt <= :createdTo', {
        createdTo: filter.createdTo,
      });
    }

    // 연회비 필터 (특정 연도)
    if (filter?.year !== undefined) {
      queryBuilder.andWhere('membershipYear.year = :year', {
        year: filter.year,
      });

      if (filter?.paid !== undefined) {
        queryBuilder.andWhere('membershipYear.paid = :paid', {
          paid: filter.paid,
        });
      }
    }

    // 검증 상태 필터
    if (filter?.verificationStatus) {
      queryBuilder.andWhere('verification.status = :verificationStatus', {
        verificationStatus: filter.verificationStatus,
      });
    }

    // Phase 1: 약사 유형 필터
    if (filter?.pharmacistType) {
      queryBuilder.andWhere('member.pharmacistType = :pharmacistType', {
        pharmacistType: filter.pharmacistType,
      });
    }

    // Phase 1: 근무지 유형 필터
    if (filter?.workplaceType) {
      queryBuilder.andWhere('member.workplaceType = :workplaceType', {
        workplaceType: filter.workplaceType,
      });
    }

    // Phase 1: 직책 필터
    if (filter?.officialRole) {
      queryBuilder.andWhere('member.officialRole = :officialRole', {
        officialRole: filter.officialRole,
      });
    }

    // Phase 1: 성별 필터
    if (filter?.gender) {
      queryBuilder.andWhere('member.gender = :gender', {
        gender: filter.gender,
      });
    }

    // Phase 1: 임원 여부 필터
    if (filter?.isExecutive !== undefined) {
      const executiveRoles = ['president', 'vice_president', 'general_manager', 'auditor', 'director', 'branch_head', 'district_head'];
      if (filter.isExecutive) {
        queryBuilder.andWhere('member.officialRole IN (:...executiveRoles)', { executiveRoles });
      } else {
        queryBuilder.andWhere('(member.officialRole IS NULL OR member.officialRole = :noneRole)', { noneRole: 'none' });
      }
    }

    // Phase 1: 회원등록번호 필터
    if (filter?.registrationNumber) {
      queryBuilder.andWhere('member.registrationNumber LIKE :registrationNumber', {
        registrationNumber: `%${filter.registrationNumber}%`,
      });
    }

    // 전체 카운트 (페이지네이션 전)
    const total = await queryBuilder.getCount();

    // 정렬
    queryBuilder.orderBy('member.createdAt', 'DESC');

    // 페이지네이션
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    // Phase P0 Task D: Enrich members with User data (name/phone/email)
    const enrichedData = await this.enrichMembersWithUserData(data);

    return { data: enrichedData, total };
  }

  /**
   * 회원 삭제
   */
  async delete(id: string): Promise<void> {
    const member = await this.findById(id);
    if (!member) {
      throw new Error(`Member "${id}" not found`);
    }

    await this.memberRepo.remove(member);
  }

  /**
   * 회원 검증 상태 변경
   */
  async setVerified(id: string, isVerified: boolean): Promise<Member> {
    const member = await this.findById(id);
    if (!member) {
      throw new Error(`Member "${id}" not found`);
    }

    member.isVerified = isVerified;
    return await this.memberRepo.save(member);
  }

  /**
   * 회원 활성 상태 변경
   */
  async setActive(id: string, isActive: boolean): Promise<Member> {
    const member = await this.findById(id);
    if (!member) {
      throw new Error(`Member "${id}" not found`);
    }

    member.isActive = isActive;
    return await this.memberRepo.save(member);
  }

  /**
   * 조직별 회원 수 조회
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return await this.memberRepo.count({
      where: { organizationId },
    });
  }

  /**
   * 검증된 회원 수 조회
   */
  async countVerified(organizationId?: string): Promise<number> {
    const where: FindOptionsWhere<Member> = { isVerified: true };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return await this.memberRepo.count({ where });
  }

  /**
   * 회원 상태 계산
   *
   * 회원의 검증 이력, 연회비 납부 현황 등을 분석하여
   * computed status를 생성합니다.
   */
  computeStatus(member: Member): ComputedMemberStatus {
    const currentYear = new Date().getFullYear();

    // 1. 회원 유형 (카테고리 이름)
    const membershipType = member.category?.name || '미분류';

    // 2. 최신 검증 이력 확인
    let verificationStatus: 'pending' | 'approved' | 'rejected' | 'none' = 'none';
    let lastVerificationDate: Date | undefined;

    if (member.verifications && member.verifications.length > 0) {
      // 최신 검증 이력 찾기
      const latestVerification = member.verifications.reduce((latest, current) => {
        if (!latest || new Date(current.createdAt) > new Date(latest.createdAt)) {
          return current;
        }
        return latest;
      });

      verificationStatus = latestVerification.status as 'pending' | 'approved' | 'rejected';
      lastVerificationDate = new Date(latestVerification.createdAt);
    }

    // 3. 현재 연도 연회비 상태 확인
    let feeStatus: 'paid' | 'unpaid' | 'not_required' = 'not_required';
    let currentYearFee: ComputedMemberStatus['currentYearFee'];

    if (member.category?.requiresAnnualFee) {
      // 연회비가 필요한 카테고리인 경우
      const yearRecord = member.membershipYears?.find(y => y.year === currentYear);

      if (yearRecord) {
        feeStatus = yearRecord.paid ? 'paid' : 'unpaid';
        currentYearFee = {
          year: yearRecord.year,
          paid: yearRecord.paid,
          amount: yearRecord.amount,
          paidAt: yearRecord.paidAt,
        };
      } else {
        // 연도 기록이 없으면 미납
        feeStatus = 'unpaid';
      }
    }

    // 4. 검증 여부 (member.isVerified 또는 최신 verification이 approved인 경우)
    const isVerified = member.isVerified || verificationStatus === 'approved';

    // 5. Phase 1: 임원 여부 계산
    const isExecutive = member.isExecutive ? member.isExecutive() : false;

    return {
      isVerified,
      isActive: member.isActive,
      membershipType,
      feeStatus,
      verificationStatus,
      lastVerificationDate,
      currentYearFee,
      // Phase 1: 약사 정보
      pharmacistType: member.pharmacistType,
      workplaceType: member.workplaceType,
      isExecutive,
      officialRole: member.officialRole,
    };
  }

  /**
   * 회원 정보와 computed status를 함께 반환
   */
  enrichMemberWithStatus(member: Member) {
    return {
      ...member,
      computedStatus: this.computeStatus(member),
    };
  }

  /**
   * 일괄 업데이트
   *
   * 여러 회원의 속성을 한 번에 업데이트합니다.
   */
  async bulkUpdate(
    memberIds: string[],
    updates: Partial<UpdateMemberDto>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.update(memberId, updates);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 검증 승인/거부
   */
  async bulkSetVerified(
    memberIds: string[],
    isVerified: boolean
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.setVerified(memberId, isVerified);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 활성/비활성
   */
  async bulkSetActive(
    memberIds: string[],
    isActive: boolean
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.setActive(memberId, isActive);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 카테고리 변경
   */
  async bulkSetCategory(
    memberIds: string[],
    categoryId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    // Category 존재 확인
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error(`Category "${categoryId}" not found`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.update(memberId, { categoryId });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // ===== Phase 1: 신규 Bulk 메서드 =====

  /**
   * 일괄 약사 유형 변경
   */
  async bulkSetPharmacistType(
    memberIds: string[],
    pharmacistType: PharmacistType
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.update(memberId, { pharmacistType });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 직책 변경
   */
  async bulkSetOfficialRole(
    memberIds: string[],
    officialRole: OfficialRole
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.update(memberId, { officialRole });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 근무지 유형 변경
   */
  async bulkSetWorkplaceType(
    memberIds: string[],
    workplaceType: WorkplaceType
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.update(memberId, { workplaceType });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // ===== Phase 1: 통계 메서드 =====

  /**
   * 약사 유형별 통계
   */
  async getStatsByPharmacistType(organizationId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.pharmacistType', 'pharmacistType')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = :isActive', { isActive: true })
      .groupBy('member.pharmacistType');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();
    const stats: Record<string, number> = {};

    for (const row of results) {
      const key = row.pharmacistType || 'unset';
      stats[key] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 직책별 통계
   */
  async getStatsByOfficialRole(organizationId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.officialRole', 'officialRole')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = :isActive', { isActive: true })
      .groupBy('member.officialRole');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();
    const stats: Record<string, number> = {};

    for (const row of results) {
      const key = row.officialRole || 'none';
      stats[key] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 근무지 유형별 통계
   */
  async getStatsByWorkplaceType(organizationId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.workplaceType', 'workplaceType')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = :isActive', { isActive: true })
      .groupBy('member.workplaceType');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();
    const stats: Record<string, number> = {};

    for (const row of results) {
      const key = row.workplaceType || 'unset';
      stats[key] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 성별 통계
   */
  async getStatsByGender(organizationId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.gender', 'gender')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = :isActive', { isActive: true })
      .groupBy('member.gender');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();
    const stats: Record<string, number> = {};

    for (const row of results) {
      const key = row.gender || 'unset';
      stats[key] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 임원 수 조회
   */
  async countExecutives(organizationId?: string): Promise<number> {
    const executiveRoles = ['president', 'vice_president', 'general_manager', 'auditor', 'director', 'branch_head', 'district_head'];

    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .where('member.isActive = :isActive', { isActive: true })
      .andWhere('member.officialRole IN (:...executiveRoles)', { executiveRoles });

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    return await queryBuilder.getCount();
  }
}
