import { DataSource, Repository, In } from 'typeorm';
import { Verification } from '../entities/Verification.js';
import { Member } from '../entities/Member.js';

export interface CreateVerificationDto {
  memberId: string;
  verifierId: string;
  method: string;
  detail: Record<string, any>;
  expiresAt?: Date;
}

export interface UpdateVerificationDto {
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  detail?: Record<string, any>;
  rejectionReason?: string;
}

/**
 * VerificationService
 *
 * 회원 자격 검증 서비스
 */
export class VerificationService {
  private verificationRepo: Repository<Verification>;
  private memberRepo: Repository<Member>;

  constructor(private dataSource: DataSource) {
    this.verificationRepo = dataSource.getRepository(Verification);
    this.memberRepo = dataSource.getRepository(Member);
  }

  async create(dto: CreateVerificationDto): Promise<Verification> {
    const verification = this.verificationRepo.create(dto);
    return await this.verificationRepo.save(verification);
  }

  async update(id: string, dto: UpdateVerificationDto): Promise<Verification> {
    const verification = await this.findById(id);
    if (!verification) {
      throw new Error(`Verification "${id}" not found`);
    }

    Object.assign(verification, dto);
    return await this.verificationRepo.save(verification);
  }

  async findById(id: string): Promise<Verification | null> {
    return await this.verificationRepo.findOne({
      where: { id },
      relations: ['member'],
    });
  }

  async listByMember(memberId: string): Promise<Verification[]> {
    return await this.verificationRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  async listByStatus(status: 'pending' | 'approved' | 'rejected' | 'expired'): Promise<Verification[]> {
    return await this.verificationRepo.find({
      where: { status },
      relations: ['member'],
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, verifierId: string, notes?: string): Promise<Verification> {
    const verification = await this.findById(id);
    if (!verification) {
      throw new Error(`Verification "${id}" not found`);
    }

    verification.approve(verifierId, notes);
    const saved = await this.verificationRepo.save(verification);

    // 회원 검증 상태 업데이트
    await this.memberRepo.update(
      { id: verification.memberId },
      { isVerified: true }
    );

    return saved;
  }

  async reject(id: string, verifierId: string, reason: string): Promise<Verification> {
    const verification = await this.findById(id);
    if (!verification) {
      throw new Error(`Verification "${id}" not found`);
    }

    verification.reject(verifierId, reason);
    return await this.verificationRepo.save(verification);
  }

  async delete(id: string): Promise<void> {
    const verification = await this.findById(id);
    if (!verification) {
      throw new Error(`Verification "${id}" not found`);
    }
    await this.verificationRepo.remove(verification);
  }
}
