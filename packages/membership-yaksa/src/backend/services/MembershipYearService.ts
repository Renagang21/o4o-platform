import { DataSource, Repository } from 'typeorm';
import { MembershipYear } from '../entities/MembershipYear.js';

export interface CreateMembershipYearDto {
  memberId: string;
  year: number;
  amount?: number;
}

export interface PaymentDto {
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  receiptUrl?: string;
}

/**
 * MembershipYearService
 *
 * 연회비 관리 서비스
 */
export class MembershipYearService {
  private repo: Repository<MembershipYear>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(MembershipYear);
  }

  async create(dto: CreateMembershipYearDto): Promise<MembershipYear> {
    const existing = await this.repo.findOne({
      where: {
        memberId: dto.memberId,
        year: dto.year,
      },
    });
    if (existing) {
      throw new Error(
        `Membership year already exists for member ${dto.memberId} in year ${dto.year}`
      );
    }

    const membershipYear = this.repo.create(dto);
    return await this.repo.save(membershipYear);
  }

  async findById(id: string): Promise<MembershipYear | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['member'],
    });
  }

  async findByMemberAndYear(memberId: string, year: number): Promise<MembershipYear | null> {
    return await this.repo.findOne({
      where: { memberId, year },
      relations: ['member'],
    });
  }

  async listByMember(memberId: string): Promise<MembershipYear[]> {
    return await this.repo.find({
      where: { memberId },
      order: { year: 'DESC' },
    });
  }

  async listByYear(year: number): Promise<MembershipYear[]> {
    return await this.repo.find({
      where: { year },
      relations: ['member'],
      order: { paid: 'ASC', createdAt: 'DESC' },
    });
  }

  async markAsPaid(id: string, payment: PaymentDto): Promise<MembershipYear> {
    const membershipYear = await this.findById(id);
    if (!membershipYear) {
      throw new Error(`MembershipYear "${id}" not found`);
    }

    membershipYear.markAsPaid(
      payment.amount,
      payment.paymentMethod,
      payment.transactionId
    );
    if (payment.receiptUrl) {
      membershipYear.receiptUrl = payment.receiptUrl;
    }

    return await this.repo.save(membershipYear);
  }

  async countPaidByYear(year: number): Promise<number> {
    return await this.repo.count({
      where: { year, paid: true },
    });
  }

  async countUnpaidByYear(year: number): Promise<number> {
    return await this.repo.count({
      where: { year, paid: false },
    });
  }

  async delete(id: string): Promise<void> {
    const membershipYear = await this.findById(id);
    if (!membershipYear) {
      throw new Error(`MembershipYear "${id}" not found`);
    }
    await this.repo.remove(membershipYear);
  }
}
