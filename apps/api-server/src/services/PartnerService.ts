import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Partner, PartnerStatus, PartnerTier } from '../entities/Partner';
import { PartnerCommission, CommissionStatus } from '../entities/PartnerCommission';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Seller } from '../entities/Seller';
import logger from '../utils/logger';

export interface CreatePartnerRequest {
  userId: string;
  businessName?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    youtube?: string;
    blog?: string;
    tiktok?: string;
  };
  marketingChannels?: string[];
  expectedMonthlyTraffic?: number;
  targetAudience?: string;
  bio?: string;
  profileImage?: string;
}

export interface UpdatePartnerRequest extends Partial<CreatePartnerRequest> {
  status?: PartnerStatus;
  tier?: PartnerTier;
}

export interface PartnerFilters {
  status?: PartnerStatus;
  tier?: PartnerTier;
  isActive?: boolean;
  minCommissionEarned?: number;
  maxCommissionEarned?: number;
  registeredAfter?: Date;
  registeredBefore?: Date;
  search?: string;
  sortBy?: 'registeredAt' | 'totalCommissions' | 'activeCommissions' | 'businessName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CommissionFilters {
  partnerId?: string;
  status?: CommissionStatus;
  productId?: string;
  sellerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  referralCode?: string;
  sortBy?: 'createdAt' | 'commissionAmount' | 'orderAmount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ReferralLinkParams {
  partnerId: string;
  productId?: string;
  sellerId?: string;
  campaign?: string;
  source?: string;
  medium?: string;
  content?: string;
}

export class PartnerService {
  private partnerRepository: Repository<Partner>;
  private commissionRepository: Repository<PartnerCommission>;
  private userRepository: Repository<User>;
  private productRepository: Repository<Product>;
  private sellerRepository: Repository<Seller>;

  constructor() {
    this.partnerRepository = AppDataSource.getRepository(Partner);
    this.commissionRepository = AppDataSource.getRepository(PartnerCommission);
    this.userRepository = AppDataSource.getRepository(User);
    this.productRepository = AppDataSource.getRepository(Product);
    this.sellerRepository = AppDataSource.getRepository(Seller);
  }

  // 파트너 등록 신청
  async applyAsPartner(data: CreatePartnerRequest): Promise<Partner> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: data.userId, isActive: true }
      });

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // 이미 파트너인지 확인
      const existingPartner = await this.partnerRepository.findOne({
        where: { userId: data.userId }
      });

      if (existingPartner) {
        throw new Error('User is already a partner');
      }

      // 추천 코드 생성
      const referralCode = await this.generateUniqueReferralCode();

      const partner = this.partnerRepository.create({
        ...data,
        referralCode,
        status: PartnerStatus.PENDING,
        tier: PartnerTier.BRONZE,
        totalEarnings: 0,
        totalClicks: 0,
        totalOrders: 0,
        conversionRate: 0,
        lastActiveAt: new Date()
      });

      const savedPartner = await this.partnerRepository.save(partner);

      // 사용자에게 파트너 역할 추가
      if (!user.roles.includes('partner')) {
        user.roles = [...user.roles, 'partner'];
        await this.userRepository.save(user);
      }

      logger.info(`Partner application submitted: ${savedPartner.id} by user ${data.userId}`);
      
      return savedPartner;

    } catch (error) {
      logger.error('Error creating partner application:', error);
      throw error;
    }
  }

  // 파트너 승인/거절
  async approvePartner(partnerId: string, approved: boolean, adminNotes?: string): Promise<Partner> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { id: partnerId }
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== PartnerStatus.PENDING) {
        throw new Error('Partner is not in pending status');
      }

      partner.status = approved ? PartnerStatus.ACTIVE : PartnerStatus.REJECTED;
      partner.isActive = approved;
      
      if (adminNotes) {
        // Note: adminNotes field doesn't exist in Partner entity, store in metadata instead
        partner.metadata = { ...partner.metadata, adminNotes };
      }

      if (approved) {
        partner.approvedAt = new Date();
      }

      const updatedPartner = await this.partnerRepository.save(partner);

      logger.info(`Partner ${approved ? 'approved' : 'rejected'}: ${partnerId}`);
      
      return updatedPartner;

    } catch (error) {
      logger.error('Error approving partner:', error);
      throw error;
    }
  }

  // 파트너 조회
  async getPartner(id: string): Promise<Partner | null> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { id },
        relations: ['user']
      });

      return partner;

    } catch (error) {
      logger.error('Error fetching partner:', error);
      throw error;
    }
  }

  // 파트너 목록 조회
  async getPartners(filters: PartnerFilters = {}) {
    try {
      const {
        status,
        tier,
        isActive,
        minCommissionEarned,
        maxCommissionEarned,
        registeredAfter,
        registeredBefore,
        search,
        sortBy = 'registeredAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const queryBuilder = this.partnerRepository
        .createQueryBuilder('partner')
        .leftJoinAndSelect('partner.user', 'user');

      if (status) {
        queryBuilder.andWhere('partner.status = :status', { status });
      }

      if (tier) {
        queryBuilder.andWhere('partner.tier = :tier', { tier });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('partner.isActive = :isActive', { isActive });
      }

      if (minCommissionEarned !== undefined) {
        queryBuilder.andWhere('partner.totalCommissions >= :minCommissionEarned', { minCommissionEarned });
      }

      if (maxCommissionEarned !== undefined) {
        queryBuilder.andWhere('partner.totalCommissions <= :maxCommissionEarned', { maxCommissionEarned });
      }

      if (registeredAfter) {
        queryBuilder.andWhere('partner.registeredAt >= :registeredAfter', { registeredAfter });
      }

      if (registeredBefore) {
        queryBuilder.andWhere('partner.registeredAt <= :registeredBefore', { registeredBefore });
      }

      if (search) {
        queryBuilder.andWhere(
          '(partner.businessName ILIKE :search OR partner.referralCode ILIKE :search OR user.name ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      const sortField = sortBy === 'registeredAt' ? 'partner.registeredAt' : `partner.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [partners, total] = await queryBuilder.getManyAndCount();

      return {
        partners,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching partners:', error);
      throw error;
    }
  }

  // 파트너 업데이트
  async updatePartner(id: string, data: UpdatePartnerRequest): Promise<Partner> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { id }
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      const updatedPartner = await this.partnerRepository.save({
        ...partner,
        ...data,
        updatedAt: new Date()
      });

      logger.info(`Partner updated: ${id}`);
      
      return updatedPartner;

    } catch (error) {
      logger.error('Error updating partner:', error);
      throw error;
    }
  }

  // 추천 링크 생성
  async generateReferralLink(params: ReferralLinkParams): Promise<string> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { id: params.partnerId, isActive: true, status: PartnerStatus.ACTIVE }
      });

      if (!partner) {
        throw new Error('Partner not found or inactive');
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      const url = new URL(baseUrl);

      url.searchParams.set('ref', partner.referralCode);

      if (params.productId) {
        url.searchParams.set('product', params.productId);
      }

      if (params.sellerId) {
        url.searchParams.set('seller', params.sellerId);
      }

      if (params.campaign) {
        url.searchParams.set('utm_campaign', params.campaign);
      }

      if (params.source) {
        url.searchParams.set('utm_source', params.source);
      }

      if (params.medium) {
        url.searchParams.set('utm_medium', params.medium);
      }

      if (params.content) {
        url.searchParams.set('utm_content', params.content);
      }

      return url.toString();

    } catch (error) {
      logger.error('Error generating referral link:', error);
      throw error;
    }
  }

  // 클릭 추적
  async trackClick(referralCode: string, trackingData: any): Promise<void> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { referralCode, isActive: true, status: PartnerStatus.ACTIVE }
      });

      if (!partner) {
        logger.warn(`Click tracking failed: Invalid referral code ${referralCode}`);
        return;
      }

      partner.totalClicks = (partner.totalClicks || 0) + 1;
      partner.lastActiveAt = new Date();

      await this.partnerRepository.save(partner);

      logger.info(`Click tracked for partner ${partner.id}: ${referralCode}`);

    } catch (error) {
      logger.error('Error tracking click:', error);
    }
  }

  // 커미션 내역 조회
  async getCommissions(filters: CommissionFilters = {}) {
    try {
      const {
        partnerId,
        status,
        productId,
        sellerId,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        referralCode,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const queryBuilder = this.commissionRepository
        .createQueryBuilder('commission')
        .leftJoinAndSelect('commission.partner', 'partner')
        .leftJoinAndSelect('commission.product', 'product')
        .leftJoinAndSelect('commission.seller', 'seller');

      if (partnerId) {
        queryBuilder.andWhere('commission.partnerId = :partnerId', { partnerId });
      }

      if (status) {
        queryBuilder.andWhere('commission.status = :status', { status });
      }

      if (productId) {
        queryBuilder.andWhere('commission.productId = :productId', { productId });
      }

      if (sellerId) {
        queryBuilder.andWhere('commission.sellerId = :sellerId', { sellerId });
      }

      if (dateFrom) {
        queryBuilder.andWhere('commission.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('commission.createdAt <= :dateTo', { dateTo });
      }

      if (minAmount !== undefined) {
        queryBuilder.andWhere('commission.commissionAmount >= :minAmount', { minAmount });
      }

      if (maxAmount !== undefined) {
        queryBuilder.andWhere('commission.commissionAmount <= :maxAmount', { maxAmount });
      }

      if (referralCode) {
        queryBuilder.andWhere('commission.referralCode = :referralCode', { referralCode });
      }

      const sortField = `commission.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [commissions, total] = await queryBuilder.getManyAndCount();

      return {
        commissions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching commissions:', error);
      throw error;
    }
  }

  // 파트너 성과 통계
  async getPartnerStats(partnerId: string, period?: 'week' | 'month' | 'quarter' | 'year') {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { id: partnerId }
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      let dateFrom: Date;
      const now = new Date();

      switch (period) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = partner.createdAt;
      }

      const stats = await this.commissionRepository
        .createQueryBuilder('commission')
        .select([
          'COUNT(*) as totalCommissions',
          'COUNT(CASE WHEN commission.status = :pending THEN 1 END) as pendingCommissions',
          'COUNT(CASE WHEN commission.status = :confirmed THEN 1 END) as confirmedCommissions',
          'COUNT(CASE WHEN commission.status = :paid THEN 1 END) as paidCommissions',
          'SUM(commission.commissionAmount) as totalEarnings',
          'SUM(CASE WHEN commission.status = :pending THEN commission.commissionAmount ELSE 0 END) as pendingEarnings',
          'SUM(CASE WHEN commission.status = :confirmed THEN commission.commissionAmount ELSE 0 END) as confirmedEarnings',
          'SUM(CASE WHEN commission.status = :paid THEN commission.commissionAmount ELSE 0 END) as paidEarnings',
          'AVG(commission.commissionAmount) as averageCommission',
          'COUNT(DISTINCT commission.sellerId) as uniqueSellers',
          'COUNT(DISTINCT commission.productId) as uniqueProducts'
        ])
        .where('commission.partnerId = :partnerId', { partnerId })
        .andWhere('commission.createdAt >= :dateFrom', { dateFrom })
        .setParameters({
          pending: CommissionStatus.PENDING,
          confirmed: CommissionStatus.CONFIRMED,
          paid: CommissionStatus.PAID
        })
        .getRawOne();

      const conversionRate = partner.totalClicks > 0 
        ? (parseInt(stats.totalCommissions) / partner.totalClicks) * 100 
        : 0;

      return {
        totalCommissions: parseInt(stats.totalCommissions) || 0,
        pendingCommissions: parseInt(stats.pendingCommissions) || 0,
        confirmedCommissions: parseInt(stats.confirmedCommissions) || 0,
        paidCommissions: parseInt(stats.paidCommissions) || 0,
        totalEarnings: parseFloat(stats.totalEarnings) || 0,
        pendingEarnings: parseFloat(stats.pendingEarnings) || 0,
        confirmedEarnings: parseFloat(stats.confirmedEarnings) || 0,
        paidEarnings: parseFloat(stats.paidEarnings) || 0,
        averageCommission: parseFloat(stats.averageCommission) || 0,
        uniqueSellers: parseInt(stats.uniqueSellers) || 0,
        uniqueProducts: parseInt(stats.uniqueProducts) || 0,
        totalClicks: partner.totalClicks || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        period: period || 'all',
        dateFrom,
        dateTo: now
      };

    } catch (error) {
      logger.error('Error fetching partner stats:', error);
      throw error;
    }
  }

  // 파트너 티어 업데이트 (월별 자동 실행)
  async updatePartnerTiers(): Promise<void> {
    try {
      const partners = await this.partnerRepository.find({
        where: { isActive: true, status: PartnerStatus.ACTIVE }
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for (const partner of partners) {
        const monthlyStats = await this.commissionRepository
          .createQueryBuilder('commission')
          .select('SUM(commission.commissionAmount)', 'totalCommissions')
          .where('commission.partnerId = :partnerId', { partnerId: partner.id })
          .andWhere('commission.status = :status', { status: CommissionStatus.PAID })
          .andWhere('commission.createdAt >= :dateFrom', { dateFrom: thirtyDaysAgo })
          .getRawOne();

        const monthlyCommissions = parseFloat(monthlyStats.totalCommissions) || 0;

        let newTier = PartnerTier.BRONZE;

        if (monthlyCommissions >= 1000000) { // 100만원 이상
          newTier = PartnerTier.PLATINUM;
        } else if (monthlyCommissions >= 500000) { // 50만원 이상
          newTier = PartnerTier.GOLD;
        } else if (monthlyCommissions >= 200000) { // 20만원 이상
          newTier = PartnerTier.SILVER;
        }

        if (partner.tier !== newTier) {
          partner.tier = newTier;
          await this.partnerRepository.save(partner);
          logger.info(`Partner tier updated: ${partner.id} -> ${newTier}`);
        }
      }

    } catch (error) {
      logger.error('Error updating partner tiers:', error);
      throw error;
    }
  }

  // 파트너 통계 요약 (관리자용)
  async getOverallStats() {
    try {
      const partnerStats = await this.partnerRepository
        .createQueryBuilder('partner')
        .select([
          'COUNT(*) as totalPartners',
          'COUNT(CASE WHEN partner.status = :active THEN 1 END) as activePartners',
          'COUNT(CASE WHEN partner.status = :pending THEN 1 END) as pendingPartners',
          'COUNT(CASE WHEN partner.tier = :bronze THEN 1 END) as bronzePartners',
          'COUNT(CASE WHEN partner.tier = :silver THEN 1 END) as silverPartners',
          'COUNT(CASE WHEN partner.tier = :gold THEN 1 END) as goldPartners',
          'COUNT(CASE WHEN partner.tier = :platinum THEN 1 END) as platinumPartners'
        ])
        .setParameters({
          active: PartnerStatus.ACTIVE,
          pending: PartnerStatus.PENDING,
          bronze: PartnerTier.BRONZE,
          silver: PartnerTier.SILVER,
          gold: PartnerTier.GOLD,
          platinum: PartnerTier.PLATINUM
        })
        .getRawOne();

      const commissionStats = await this.commissionRepository
        .createQueryBuilder('commission')
        .select([
          'COUNT(*) as totalCommissions',
          'SUM(commission.commissionAmount) as totalCommissionAmount',
          'AVG(commission.commissionAmount) as averageCommission',
          'COUNT(CASE WHEN commission.status = :pending THEN 1 END) as pendingCommissions',
          'COUNT(CASE WHEN commission.status = :confirmed THEN 1 END) as confirmedCommissions',
          'COUNT(CASE WHEN commission.status = :paid THEN 1 END) as paidCommissions'
        ])
        .setParameters({
          pending: CommissionStatus.PENDING,
          confirmed: CommissionStatus.CONFIRMED,
          paid: CommissionStatus.PAID
        })
        .getRawOne();

      return {
        partners: {
          total: parseInt(partnerStats.totalPartners) || 0,
          active: parseInt(partnerStats.activePartners) || 0,
          pending: parseInt(partnerStats.pendingPartners) || 0,
          bronze: parseInt(partnerStats.bronzePartners) || 0,
          silver: parseInt(partnerStats.silverPartners) || 0,
          gold: parseInt(partnerStats.goldPartners) || 0,
          platinum: parseInt(partnerStats.platinumPartners) || 0
        },
        commissions: {
          total: parseInt(commissionStats.totalCommissions) || 0,
          totalAmount: parseFloat(commissionStats.totalCommissionAmount) || 0,
          average: parseFloat(commissionStats.averageCommission) || 0,
          pending: parseInt(commissionStats.pendingCommissions) || 0,
          confirmed: parseInt(commissionStats.confirmedCommissions) || 0,
          paid: parseInt(commissionStats.paidCommissions) || 0
        }
      };

    } catch (error) {
      logger.error('Error fetching overall stats:', error);
      throw error;
    }
  }

  // 추천 코드 고유성 확인 및 생성
  private async generateUniqueReferralCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateReferralCode();
      
      const existing = await this.partnerRepository.findOne({
        where: { referralCode: code }
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique referral code');
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default PartnerService;