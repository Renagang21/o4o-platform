import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { Member } from '../entities/Member.js';
import { MemberCategory } from '../entities/MemberCategory.js';

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
}

/**
 * MemberService
 *
 * 회원 관리 서비스
 */
export class MemberService {
  private memberRepo: Repository<Member>;
  private categoryRepo: Repository<MemberCategory>;

  constructor(private dataSource: DataSource) {
    this.memberRepo = dataSource.getRepository(Member);
    this.categoryRepo = dataSource.getRepository(MemberCategory);
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
   */
  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
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

    Object.assign(member, dto);
    return await this.memberRepo.save(member);
  }

  /**
   * 회원 조회 (ID)
   */
  async findById(id: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { id },
      relations: ['category', 'affiliations', 'membershipYears', 'verifications'],
    });
  }

  /**
   * 회원 조회 (User ID)
   */
  async findByUserId(userId: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { userId },
      relations: ['category', 'affiliations', 'membershipYears', 'verifications'],
    });
  }

  /**
   * 회원 조회 (면허번호)
   */
  async findByLicenseNumber(licenseNumber: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { licenseNumber },
      relations: ['category'],
    });
  }

  /**
   * 회원 목록 조회
   */
  async list(filter?: MemberFilterDto): Promise<Member[]> {
    const where: FindOptionsWhere<Member> = {};

    if (filter) {
      if (filter.organizationId) where.organizationId = filter.organizationId;
      if (filter.categoryId) where.categoryId = filter.categoryId;
      if (filter.isVerified !== undefined) where.isVerified = filter.isVerified;
      if (filter.isActive !== undefined) where.isActive = filter.isActive;
      if (filter.licenseNumber) where.licenseNumber = filter.licenseNumber;
      if (filter.name) where.name = filter.name;
    }

    return await this.memberRepo.find({
      where,
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
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
}
