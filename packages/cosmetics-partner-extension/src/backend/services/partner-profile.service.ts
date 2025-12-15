/**
 * PartnerProfileService
 *
 * 파트너 프로필 관리 서비스
 */

import type { Repository } from 'typeorm';
import { PartnerProfile, PartnerType, PartnerStatus, SocialLinks } from '../entities/partner-profile.entity';

export interface CreatePartnerProfileDto {
  userId: string;
  referralCode?: string;
  partnerType: PartnerType;
  displayName?: string;
  introduction?: string;
  socialLinks?: SocialLinks;
  bio?: string;
  profileImageUrl?: string;
  instagramHandle?: string;
  youtubeChannel?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerProfileDto {
  partnerType?: PartnerType;
  displayName?: string;
  introduction?: string;
  socialLinks?: SocialLinks;
  bio?: string;
  profileImageUrl?: string;
  defaultCommissionRate?: number;
  instagramHandle?: string;
  youtubeChannel?: string;
  metadata?: Record<string, unknown>;
}

export class PartnerProfileService {
  constructor(private readonly profileRepository: Repository<PartnerProfile>) {}

  async createProfile(dto: CreatePartnerProfileDto): Promise<PartnerProfile> {
    // Check if profile already exists for this user
    const existing = await this.profileRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new Error('Partner profile already exists for this user');
    }

    // Check if referral code is unique
    const existingCode = await this.profileRepository.findOne({
      where: { referralCode: dto.referralCode },
    });

    if (existingCode) {
      throw new Error('Referral code already in use');
    }

    const profile = this.profileRepository.create({
      ...dto,
      status: 'pending',
      totalEarnings: 0,
      availableBalance: 0,
    });

    return this.profileRepository.save(profile);
  }

  async findById(id: string): Promise<PartnerProfile | null> {
    return this.profileRepository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<PartnerProfile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  async findByReferralCode(referralCode: string): Promise<PartnerProfile | null> {
    return this.profileRepository.findOne({ where: { referralCode } });
  }

  async updateProfile(id: string, dto: UpdatePartnerProfileDto): Promise<PartnerProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new Error('Partner profile not found');
    }

    Object.assign(profile, dto);
    return this.profileRepository.save(profile);
  }

  async updateStatus(id: string, status: PartnerStatus, _approvedBy?: string): Promise<PartnerProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new Error('Partner profile not found');
    }

    profile.status = status;
    // TODO: Track approvedBy in metadata if needed
    return this.profileRepository.save(profile);
  }

  async updateEarnings(id: string, amount: number): Promise<PartnerProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new Error('Partner profile not found');
    }

    profile.totalEarnings = Number(profile.totalEarnings) + amount;
    profile.availableBalance = Number(profile.availableBalance) + amount;
    return this.profileRepository.save(profile);
  }

  async deductBalance(id: string, amount: number): Promise<PartnerProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new Error('Partner profile not found');
    }

    if (Number(profile.availableBalance) < amount) {
      throw new Error('Insufficient balance');
    }

    profile.availableBalance = Number(profile.availableBalance) - amount;
    return this.profileRepository.save(profile);
  }

  async findByType(partnerType: PartnerType): Promise<PartnerProfile[]> {
    return this.profileRepository.find({
      where: { partnerType },
      order: { totalEarnings: 'DESC' },
    });
  }

  async findByStatus(status: PartnerStatus): Promise<PartnerProfile[]> {
    return this.profileRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(options?: {
    status?: PartnerStatus;
    partnerType?: PartnerType;
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<PartnerProfile[]> {
    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.partnerType) where.partnerType = options.partnerType;

    return this.profileRepository.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset ?? (options?.page ? (options.page - 1) * (options.limit || 10) : undefined),
    });
  }

  async getTopEarners(limit: number = 10): Promise<PartnerProfile[]> {
    return this.profileRepository.find({
      where: { status: 'active' },
      order: { totalEarnings: 'DESC' },
      take: limit,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.profileRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
