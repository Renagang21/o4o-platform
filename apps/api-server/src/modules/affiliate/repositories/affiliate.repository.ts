import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateUser } from '../../../entities/affiliate/AffiliateUser';
import { AffiliateClick } from '../../../entities/affiliate/AffiliateClick';
import { AffiliateConversion } from '../../../entities/affiliate/AffiliateConversion';

export class AffiliateRepository {
  private affiliateUserRepo: Repository<AffiliateUser>;
  private clickRepo: Repository<AffiliateClick>;
  private conversionRepo: Repository<AffiliateConversion>;

  constructor() {
    this.affiliateUserRepo = AppDataSource.getRepository(AffiliateUser);
    this.clickRepo = AppDataSource.getRepository(AffiliateClick);
    this.conversionRepo = AppDataSource.getRepository(AffiliateConversion);
  }

  // Affiliate User Methods
  async createAffiliateUser(data: Partial<AffiliateUser>): Promise<AffiliateUser> {
    const affiliateUser = this.affiliateUserRepo.create(data);
    return await this.affiliateUserRepo.save(affiliateUser);
  }

  async findAffiliateUserById(id: string): Promise<AffiliateUser | null> {
    return await this.affiliateUserRepo.findOne({
      where: { id },
      relations: ['user']
    });
  }

  async findAffiliateUserByUserId(userId: string): Promise<AffiliateUser | null> {
    return await this.affiliateUserRepo.findOne({
      where: { userId },
      relations: ['user']
    });
  }

  async findAffiliateUserByReferralCode(referralCode: string): Promise<AffiliateUser | null> {
    return await this.affiliateUserRepo.findOne({
      where: { referralCode },
      relations: ['user']
    });
  }

  async updateAffiliateUser(id: string, data: Partial<AffiliateUser>): Promise<AffiliateUser | null> {
    await this.affiliateUserRepo.update(id, data);
    return await this.findAffiliateUserById(id);
  }

  async incrementAffiliateStats(
    affiliateUserId: string,
    field: 'totalClicks' | 'totalConversions',
    amount: number = 1
  ): Promise<void> {
    await this.affiliateUserRepo
      .createQueryBuilder()
      .update(AffiliateUser)
      .set({
        [field]: () => `${field} + ${amount}`,
        ...(field === 'totalClicks' ? { lastClickAt: new Date() } : { lastConversionAt: new Date() })
      })
      .where('id = :id', { id: affiliateUserId })
      .execute();
  }

  async updateAffiliateEarnings(
    affiliateUserId: string,
    commissionAmount: number,
    type: 'pending' | 'paid' = 'pending'
  ): Promise<void> {
    const updateFields: any = {
      totalEarnings: () => `"totalEarnings" + ${commissionAmount}`
    };

    if (type === 'pending') {
      updateFields.pendingEarnings = () => `"pendingEarnings" + ${commissionAmount}`;
    } else {
      updateFields.paidEarnings = () => `"paidEarnings" + ${commissionAmount}`;
      updateFields.pendingEarnings = () => `"pendingEarnings" - ${commissionAmount}`;
    }

    await this.affiliateUserRepo
      .createQueryBuilder()
      .update(AffiliateUser)
      .set(updateFields)
      .where('id = :id', { id: affiliateUserId })
      .execute();
  }

  // Click Methods
  async createClick(data: Partial<AffiliateClick>): Promise<AffiliateClick> {
    const click = this.clickRepo.create(data);
    return await this.clickRepo.save(click);
  }

  async findClickBySessionId(sessionId: string): Promise<AffiliateClick | null> {
    return await this.clickRepo.findOne({
      where: { sessionId },
      relations: ['affiliateUser']
    });
  }

  async findClicksByAffiliateUser(
    affiliateUserId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateClick[]> {
    const whereConditions: any = { affiliateUserId };

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(endDate);
    }

    return await this.clickRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' }
    });
  }

  async markClickAsConverted(clickId: string): Promise<void> {
    await this.clickRepo.update(clickId, {
      isConverted: true,
      convertedAt: new Date()
    });
  }

  async getClickStats(affiliateUserId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.clickRepo.createQueryBuilder('click');

    if (affiliateUserId) {
      query.andWhere('click.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate) {
      query.andWhere('click.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('click.createdAt <= :endDate', { endDate });
    }

    const result = await query
      .select('COUNT(*)', 'totalClicks')
      .addSelect('COUNT(DISTINCT click.sessionId)', 'uniqueClicks')
      .addSelect('COUNT(DISTINCT click.ipAddress)', 'uniqueVisitors')
      .addSelect('SUM(CASE WHEN click.isConverted = true THEN 1 ELSE 0 END)', 'convertedClicks')
      .getRawOne();

    return {
      totalClicks: parseInt(result.totalClicks) || 0,
      uniqueClicks: parseInt(result.uniqueClicks) || 0,
      uniqueVisitors: parseInt(result.uniqueVisitors) || 0,
      convertedClicks: parseInt(result.convertedClicks) || 0
    };
  }

  // Conversion Methods
  async createConversion(data: Partial<AffiliateConversion>): Promise<AffiliateConversion> {
    const conversion = this.conversionRepo.create(data);
    return await this.conversionRepo.save(conversion);
  }

  async findConversionById(id: string): Promise<AffiliateConversion | null> {
    return await this.conversionRepo.findOne({
      where: { id },
      relations: ['affiliateUser', 'customer', 'order']
    });
  }

  async findConversionByOrderId(orderId: string): Promise<AffiliateConversion | null> {
    return await this.conversionRepo.findOne({
      where: { orderId },
      relations: ['affiliateUser']
    });
  }

  async findConversionsByAffiliateUser(
    affiliateUserId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateConversion[]> {
    const whereConditions: any = { affiliateUserId };

    if (status) {
      whereConditions.status = status;
    }

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(endDate);
    }

    return await this.conversionRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' }
    });
  }

  async updateConversionStatus(
    conversionId: string,
    status: 'approved' | 'rejected' | 'paid',
    approvedBy?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'approved' && approvedBy) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy;
    } else if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    await this.conversionRepo.update(conversionId, updateData);
  }

  async getConversionStats(affiliateUserId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.conversionRepo.createQueryBuilder('conversion');

    if (affiliateUserId) {
      query.andWhere('conversion.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate) {
      query.andWhere('conversion.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    const result = await query
      .select('COUNT(*)', 'totalConversions')
      .addSelect('SUM(conversion.orderAmount)', 'totalRevenue')
      .addSelect('SUM(conversion.commissionAmount)', 'totalCommission')
      .addSelect('SUM(CASE WHEN conversion.status = \'pending\' THEN conversion.commissionAmount ELSE 0 END)', 'pendingCommission')
      .addSelect('SUM(CASE WHEN conversion.status = \'approved\' THEN conversion.commissionAmount ELSE 0 END)', 'approvedCommission')
      .addSelect('SUM(CASE WHEN conversion.status = \'paid\' THEN conversion.commissionAmount ELSE 0 END)', 'paidCommission')
      .getRawOne();

    return {
      totalConversions: parseInt(result.totalConversions) || 0,
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      totalCommission: parseFloat(result.totalCommission) || 0,
      pendingCommission: parseFloat(result.pendingCommission) || 0,
      approvedCommission: parseFloat(result.approvedCommission) || 0,
      paidCommission: parseFloat(result.paidCommission) || 0
    };
  }

  async getDailyStats(affiliateUserId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const clickQuery = this.clickRepo.createQueryBuilder('click')
      .select('DATE(click.createdAt)', 'date')
      .addSelect('COUNT(*)', 'clicks')
      .groupBy('DATE(click.createdAt)');

    const conversionQuery = this.conversionRepo.createQueryBuilder('conversion')
      .select('DATE(conversion.createdAt)', 'date')
      .addSelect('COUNT(*)', 'conversions')
      .addSelect('SUM(conversion.orderAmount)', 'revenue')
      .addSelect('SUM(conversion.commissionAmount)', 'commission')
      .groupBy('DATE(conversion.createdAt)');

    if (affiliateUserId) {
      clickQuery.andWhere('click.affiliateUserId = :affiliateUserId', { affiliateUserId });
      conversionQuery.andWhere('conversion.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate) {
      clickQuery.andWhere('click.createdAt >= :startDate', { startDate });
      conversionQuery.andWhere('conversion.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      clickQuery.andWhere('click.createdAt <= :endDate', { endDate });
      conversionQuery.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    const [clicks, conversions] = await Promise.all([
      clickQuery.getRawMany(),
      conversionQuery.getRawMany()
    ]);

    // Merge results
    const statsMap = new Map();

    clicks.forEach(row => {
      statsMap.set(row.date, {
        date: row.date,
        clicks: parseInt(row.clicks) || 0,
        conversions: 0,
        revenue: 0,
        commission: 0
      });
    });

    conversions.forEach(row => {
      const existing = statsMap.get(row.date) || {
        date: row.date,
        clicks: 0
      };
      
      statsMap.set(row.date, {
        ...existing,
        conversions: parseInt(row.conversions) || 0,
        revenue: parseFloat(row.revenue) || 0,
        commission: parseFloat(row.commission) || 0
      });
    });

    return Array.from(statsMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}