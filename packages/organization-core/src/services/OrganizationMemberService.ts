import { DataSource, Repository, IsNull } from 'typeorm';
import { OrganizationMember } from '../entities/OrganizationMember';
import { Organization } from '../entities/Organization';
import {
  CreateOrganizationMemberDto,
  UpdateOrganizationMemberDto,
  ListOrganizationMemberDto,
} from '../types/dtos';

/**
 * OrganizationMemberService
 *
 * 조직 멤버 관리 서비스
 */
export class OrganizationMemberService {
  private memberRepo: Repository<OrganizationMember>;
  private organizationRepo: Repository<Organization>;

  constructor(private dataSource: DataSource) {
    this.memberRepo = dataSource.getRepository(OrganizationMember);
    this.organizationRepo = dataSource.getRepository(Organization);
  }

  /**
   * 조직 멤버 추가
   *
   * 중복 가입 방지, isPrimary 처리
   */
  async addMember(
    organizationId: string,
    dto: CreateOrganizationMemberDto
  ): Promise<OrganizationMember> {
    // 1. 조직 존재 확인
    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!org) {
      throw new Error(`Organization "${organizationId}" not found`);
    }

    // 2. 중복 가입 체크
    const existing = await this.memberRepo.findOne({
      where: {
        organizationId,
        userId: dto.userId,
        leftAt: IsNull(),
      },
    });
    if (existing) {
      throw new Error(
        `User "${dto.userId}" is already a member of organization "${organizationId}"`
      );
    }

    // 3. isPrimary 처리
    if (dto.isPrimary) {
      await this.setPrimaryOrganization(dto.userId, organizationId);
    }

    // 4. 멤버 추가
    const member = new OrganizationMember();
    member.organizationId = organizationId;
    member.userId = dto.userId;
    member.role = dto.role;
    member.isPrimary = dto.isPrimary || false;
    member.metadata = dto.metadata;
    member.joinedAt = new Date();

    return await this.memberRepo.save(member);
  }

  /**
   * 조직 멤버 삭제 (Soft Delete)
   *
   * leftAt에 현재 시간 설정
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        organizationId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!member) {
      throw new Error(
        `User "${userId}" is not a member of organization "${organizationId}"`
      );
    }

    // Soft delete
    member.leftAt = new Date();
    await this.memberRepo.save(member);
  }

  /**
   * 조직 멤버 목록 조회
   */
  async listMembers(
    organizationId: string,
    filter: ListOrganizationMemberDto = {}
  ): Promise<{
    items: OrganizationMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.memberRepo.createQueryBuilder('member');

    // 조직 필터
    qb.where('member.organizationId = :orgId', { orgId: organizationId });

    // 탈퇴 멤버 제외 (기본값)
    if (!filter.includeLeft) {
      qb.andWhere('member.leftAt IS NULL');
    }

    // 역할 필터
    if (filter.role) {
      qb.andWhere('member.role = :role', { role: filter.role });
    }

    // 페이지네이션
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || 20, 100);
    const offset = (page - 1) * limit;

    // 정렬: joinedAt DESC
    qb.orderBy('member.joinedAt', 'DESC');

    // 총 개수
    const total = await qb.getCount();

    // 페이지네이션 적용
    qb.skip(offset).take(limit);

    const items = await qb.getMany();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * 조직 멤버 역할 수정
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationMemberDto
  ): Promise<OrganizationMember> {
    const member = await this.memberRepo.findOne({
      where: {
        organizationId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!member) {
      throw new Error(
        `User "${userId}" is not a member of organization "${organizationId}"`
      );
    }

    // 역할 변경
    if (dto.role !== undefined) {
      member.role = dto.role;
    }

    // isPrimary 변경
    if (dto.isPrimary !== undefined) {
      if (dto.isPrimary) {
        await this.setPrimaryOrganization(userId, organizationId);
      }
      member.isPrimary = dto.isPrimary;
    }

    // metadata 변경
    if (dto.metadata !== undefined) {
      member.metadata = {
        ...member.metadata,
        ...dto.metadata,
      };
    }

    return await this.memberRepo.save(member);
  }

  /**
   * 주 소속 조직 설정
   *
   * 한 사용자는 하나의 주 소속 조직만 가질 수 있습니다.
   */
  async setPrimaryOrganization(
    userId: string,
    organizationId: string
  ): Promise<void> {
    // 1. 기존 주 소속 조직 해제
    await this.memberRepo.update(
      {
        userId,
        isPrimary: true,
      },
      {
        isPrimary: false,
      }
    );

    // 2. 새 주 소속 조직 설정
    await this.memberRepo.update(
      {
        userId,
        organizationId,
      },
      {
        isPrimary: true,
      }
    );
  }

  /**
   * 사용자의 조직 목록 조회
   */
  async getUserOrganizations(
    userId: string,
    includeLeft: boolean = false
  ): Promise<OrganizationMember[]> {
    const qb = this.memberRepo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.organization', 'org')
      .where('member.userId = :userId', { userId });

    if (!includeLeft) {
      qb.andWhere('member.leftAt IS NULL');
    }

    qb.orderBy('member.isPrimary', 'DESC').addOrderBy(
      'member.joinedAt',
      'ASC'
    );

    return await qb.getMany();
  }

  /**
   * 멤버십 확인
   */
  async isMember(userId: string, organizationId: string): Promise<boolean> {
    const count = await this.memberRepo.count({
      where: {
        userId,
        organizationId,
        leftAt: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * 조직의 활성 멤버 수 조회
   */
  async getActiveMemberCount(organizationId: string): Promise<number> {
    return await this.memberRepo.count({
      where: {
        organizationId,
        leftAt: IsNull(),
      },
    });
  }
}
