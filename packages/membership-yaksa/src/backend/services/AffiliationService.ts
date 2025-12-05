import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { Affiliation } from '../entities/Affiliation.js';
import { Member } from '../entities/Member.js';

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
 * AffiliationService
 *
 * 회원 소속 관리 서비스
 */
export class AffiliationService {
  private affiliationRepo: Repository<Affiliation>;
  private memberRepo: Repository<Member>;

  constructor(private dataSource: DataSource) {
    this.affiliationRepo = dataSource.getRepository(Affiliation);
    this.memberRepo = dataSource.getRepository(Member);
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
}
