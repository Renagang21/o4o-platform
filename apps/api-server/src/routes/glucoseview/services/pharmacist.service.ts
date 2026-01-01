/**
 * GlucoseView Pharmacist Service
 *
 * Phase C-3: Pharmacist Membership - 약사 회원 관리
 */

import { DataSource, Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { GlucoseViewPharmacist, GlucoseViewChapter } from '../entities/index.js';
import { User } from '../../../modules/auth/entities/User.js';
import type {
  PharmacistDto,
  RegisterPharmacistRequestDto,
  UpdatePharmacistRequestDto,
  ApprovePharmacistRequestDto,
  ListPharmacistsQueryDto,
  PaginatedResponse,
  ChapterDto,
} from '../dto/index.js';

export class PharmacistService {
  private pharmacistRepository: Repository<GlucoseViewPharmacist>;
  private chapterRepository: Repository<GlucoseViewChapter>;
  private userRepository: Repository<User>;

  constructor(dataSource: DataSource) {
    this.pharmacistRepository = dataSource.getRepository(GlucoseViewPharmacist);
    this.chapterRepository = dataSource.getRepository(GlucoseViewChapter);
    this.userRepository = dataSource.getRepository(User);
  }

  /**
   * 약사 회원가입
   */
  async register(data: RegisterPharmacistRequestDto): Promise<PharmacistDto> {
    // 1. 이메일 중복 체크
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }

    // 2. 면허번호 중복 체크
    const existingLicense = await this.pharmacistRepository.findOne({
      where: { license_number: data.license_number },
    });
    if (existingLicense) {
      throw new Error('이미 등록된 면허번호입니다.');
    }

    // 3. 분회 확인
    const chapter = await this.chapterRepository.findOne({
      where: { id: data.chapter_id },
    });
    if (!chapter) {
      throw new Error('존재하지 않는 분회입니다.');
    }

    // 4. 같은 분회 내 약국명 중복 체크
    const existingPharmacy = await this.pharmacistRepository.findOne({
      where: {
        chapter_id: data.chapter_id,
        pharmacy_name: data.pharmacy_name,
      },
    });
    if (existingPharmacy) {
      throw new Error('해당 분회에 이미 같은 이름의 약국이 등록되어 있습니다.');
    }

    // 5. Core User 생성
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.real_name,
      isActive: false, // 승인 전까지 비활성화
    });
    const savedUser = await this.userRepository.save(user);

    // 6. Pharmacist 프로필 생성
    const pharmacist = this.pharmacistRepository.create({
      user_id: savedUser.id,
      license_number: data.license_number,
      real_name: data.real_name,
      display_name: data.display_name,
      phone: data.phone,
      email: data.email,
      chapter_id: data.chapter_id,
      pharmacy_name: data.pharmacy_name,
      role: 'pharmacist',
      approval_status: 'pending',
    });

    const savedPharmacist = await this.pharmacistRepository.save(pharmacist);

    return this.toPharmacistDto(savedPharmacist);
  }

  /**
   * 약사 프로필 조회 (user_id로)
   */
  async getByUserId(userId: string): Promise<PharmacistDto | null> {
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user_id: userId },
      relations: ['chapter', 'chapter.branch'],
    });

    if (!pharmacist) return null;

    return this.toPharmacistDto(pharmacist);
  }

  /**
   * 약사 프로필 조회 (email로)
   */
  async getByEmail(email: string): Promise<PharmacistDto | null> {
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { email },
      relations: ['chapter', 'chapter.branch'],
    });

    if (!pharmacist) return null;

    return this.toPharmacistDto(pharmacist);
  }

  /**
   * 약사 목록 조회 (관리자용)
   */
  async listPharmacists(query: ListPharmacistsQueryDto): Promise<PaginatedResponse<PharmacistDto>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.pharmacistRepository.createQueryBuilder('pharmacist')
      .leftJoinAndSelect('pharmacist.chapter', 'chapter')
      .leftJoinAndSelect('chapter.branch', 'branch');

    if (query.search) {
      qb.andWhere(
        '(pharmacist.real_name ILIKE :search OR pharmacist.display_name ILIKE :search OR pharmacist.email ILIKE :search OR pharmacist.pharmacy_name ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.branch_id) {
      qb.andWhere('chapter.branch_id = :branchId', { branchId: query.branch_id });
    }

    if (query.chapter_id) {
      qb.andWhere('pharmacist.chapter_id = :chapterId', { chapterId: query.chapter_id });
    }

    if (query.approval_status) {
      qb.andWhere('pharmacist.approval_status = :status', { status: query.approval_status });
    }

    if (query.role) {
      qb.andWhere('pharmacist.role = :role', { role: query.role });
    }

    qb.orderBy('pharmacist.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    const [pharmacists, total] = await qb.getManyAndCount();

    return {
      data: pharmacists.map(p => this.toPharmacistDto(p)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 약사 승인/거절 (관리자용)
   */
  async approveOrReject(
    pharmacistId: string,
    data: ApprovePharmacistRequestDto,
    adminUserId: string
  ): Promise<PharmacistDto> {
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { id: pharmacistId },
      relations: ['chapter'],
    });

    if (!pharmacist) {
      throw new Error('약사를 찾을 수 없습니다.');
    }

    if (pharmacist.approval_status !== 'pending') {
      throw new Error('이미 처리된 요청입니다.');
    }

    if (data.action === 'approve') {
      pharmacist.approval_status = 'approved';
      pharmacist.approved_by = adminUserId;
      pharmacist.approved_at = new Date();

      // Core User 활성화
      await this.userRepository.update(pharmacist.user_id, { isActive: true });
    } else {
      pharmacist.approval_status = 'rejected';
      pharmacist.approved_by = adminUserId;
      pharmacist.approved_at = new Date();
      pharmacist.rejection_reason = data.rejection_reason;
    }

    const saved = await this.pharmacistRepository.save(pharmacist);
    return this.toPharmacistDto(saved);
  }

  /**
   * 약사 정보 수정
   */
  async updatePharmacist(
    userId: string,
    data: UpdatePharmacistRequestDto
  ): Promise<PharmacistDto> {
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user_id: userId },
      relations: ['chapter'],
    });

    if (!pharmacist) {
      throw new Error('약사 프로필을 찾을 수 없습니다.');
    }

    // 약국명 변경 시 중복 체크
    if (data.pharmacy_name && data.pharmacy_name !== pharmacist.pharmacy_name) {
      const existing = await this.pharmacistRepository.findOne({
        where: {
          chapter_id: pharmacist.chapter_id,
          pharmacy_name: data.pharmacy_name,
        },
      });
      if (existing) {
        throw new Error('해당 분회에 이미 같은 이름의 약국이 등록되어 있습니다.');
      }
    }

    if (data.display_name) pharmacist.display_name = data.display_name;
    if (data.phone) pharmacist.phone = data.phone;
    if (data.pharmacy_name) pharmacist.pharmacy_name = data.pharmacy_name;

    const saved = await this.pharmacistRepository.save(pharmacist);
    return this.toPharmacistDto(saved);
  }

  private toPharmacistDto(pharmacist: GlucoseViewPharmacist): PharmacistDto {
    return {
      id: pharmacist.id,
      user_id: pharmacist.user_id,
      license_number: pharmacist.license_number,
      real_name: pharmacist.real_name,
      display_name: pharmacist.display_name,
      phone: pharmacist.phone,
      email: pharmacist.email,
      chapter_id: pharmacist.chapter_id,
      pharmacy_name: pharmacist.pharmacy_name,
      role: pharmacist.role,
      approval_status: pharmacist.approval_status,
      approved_by: pharmacist.approved_by,
      approved_at: pharmacist.approved_at?.toISOString(),
      rejection_reason: pharmacist.rejection_reason,
      is_active: pharmacist.is_active,
      created_at: pharmacist.created_at.toISOString(),
      updated_at: pharmacist.updated_at.toISOString(),
      chapter: pharmacist.chapter ? {
        id: pharmacist.chapter.id,
        branch_id: pharmacist.chapter.branch_id,
        name: pharmacist.chapter.name,
        code: pharmacist.chapter.code,
        sort_order: pharmacist.chapter.sort_order,
        is_active: pharmacist.chapter.is_active,
        branch: pharmacist.chapter.branch ? {
          id: pharmacist.chapter.branch.id,
          name: pharmacist.chapter.branch.name,
          code: pharmacist.chapter.branch.code,
          sort_order: pharmacist.chapter.branch.sort_order,
          is_active: pharmacist.chapter.branch.is_active,
        } : undefined,
      } : undefined,
    };
  }
}
