import { Repository, In, Between, MoreThanOrEqual, LessThanOrEqual, Like } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateCommission } from '../../../entities/affiliate/AffiliateCommission';
import { AffiliatePayout } from '../../../entities/affiliate/AffiliatePayout';
import { AffiliateAuditLog } from '../../../entities/affiliate/AffiliateAuditLog';
import { GetCommissionsDto, GetPayoutsDto, GetAffiliateUsersDto } from '../dto/commission.dto';
import { AffiliateUser } from '../../../entities/affiliate/AffiliateUser';

export class CommissionRepository {
  private commissionRepo: Repository<AffiliateCommission>;
  private payoutRepo: Repository<AffiliatePayout>;
  private auditLogRepo: Repository<AffiliateAuditLog>;
  private affiliateUserRepo: Repository<AffiliateUser>;

  constructor() {
    this.commissionRepo = AppDataSource.getRepository(AffiliateCommission);
    this.payoutRepo = AppDataSource.getRepository(AffiliatePayout);
    this.auditLogRepo = AppDataSource.getRepository(AffiliateAuditLog);
    this.affiliateUserRepo = AppDataSource.getRepository(AffiliateUser);
  }

  // Commission Methods
  async createCommission(data: Partial<AffiliateCommission>): Promise<AffiliateCommission> {
    const commission = this.commissionRepo.create(data);
    return await this.commissionRepo.save(commission);
  }

  async findCommissionById(id: string): Promise<AffiliateCommission | null> {
    return await this.commissionRepo.findOne({
      where: { id },
      relations: ['affiliateUser', 'conversion']
    });
  }

  async findCommissionByConversionId(conversionId: string): Promise<AffiliateCommission | null> {
    return await this.commissionRepo.findOne({
      where: { conversionId },
      relations: ['affiliateUser']
    });
  }

  async findCommissionsByIds(ids: string[]): Promise<AffiliateCommission[]> {
    return await this.commissionRepo.find({
      where: { id: In(ids) },
      relations: ['affiliateUser', 'conversion']
    });
  }

  async getCommissions(params: GetCommissionsDto): Promise<{
    items: AffiliateCommission[];
    total: number;
  }> {
    const {
      affiliateUserId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = params;

    const query = this.commissionRepo.createQueryBuilder('commission')
      .leftJoinAndSelect('commission.affiliateUser', 'affiliateUser')
      .leftJoinAndSelect('commission.conversion', 'conversion');

    if (affiliateUserId) {
      query.andWhere('commission.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (status) {
      query.andWhere('commission.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('commission.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    } else if (startDate) {
      query.andWhere('commission.created_at >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('commission.created_at <= :endDate', { endDate });
    }

    query.orderBy(`commission.${orderBy}`, orderDirection);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updateCommission(id: string, data: Partial<AffiliateCommission>): Promise<void> {
    await this.commissionRepo.update(id, data);
  }

  async updateCommissions(ids: string[], data: Partial<AffiliateCommission>): Promise<void> {
    await this.commissionRepo.update({ id: In(ids) }, data);
  }

  async getCommissionStats(affiliateUserId?: string, period?: { start: Date; end: Date }): Promise<{
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    totalRejected: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  }> {
    const query = this.commissionRepo.createQueryBuilder('commission');

    if (affiliateUserId) {
      query.andWhere('commission.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (period) {
      query.andWhere('commission.created_at BETWEEN :start AND :end', period);
    }

    const result = await query
      .select('commission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(commission.amount)', 'total')
      .groupBy('commission.status')
      .getRawMany();

    const stats = {
      totalPending: 0,
      totalApproved: 0,
      totalPaid: 0,
      totalRejected: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0
    };

    result.forEach(row => {
      switch (row.status) {
        case 'pending':
          stats.totalPending = parseInt(row.count) || 0;
          stats.pendingAmount = parseFloat(row.total) || 0;
          break;
        case 'approved':
          stats.totalApproved = parseInt(row.count) || 0;
          stats.approvedAmount = parseFloat(row.total) || 0;
          break;
        case 'paid':
          stats.totalPaid = parseInt(row.count) || 0;
          stats.paidAmount = parseFloat(row.total) || 0;
          break;
        case 'rejected':
          stats.totalRejected = parseInt(row.count) || 0;
          break;
      }
    });

    return stats;
  }

  // Payout Methods
  async createPayout(data: Partial<AffiliatePayout>): Promise<AffiliatePayout> {
    const payout = this.payoutRepo.create(data);
    return await this.payoutRepo.save(payout);
  }

  async findPayoutById(id: string): Promise<AffiliatePayout | null> {
    return await this.payoutRepo.findOne({
      where: { id },
      relations: ['affiliateUser']
    });
  }

  async getPayouts(params: GetPayoutsDto): Promise<{
    items: AffiliatePayout[];
    total: number;
  }> {
    const {
      affiliateUserId,
      status,
      month,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = params;

    const query = this.payoutRepo.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.affiliateUser', 'affiliateUser');

    if (affiliateUserId) {
      query.andWhere('payout.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (status) {
      query.andWhere('payout.status = :status', { status });
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      query.andWhere('payout.created_at BETWEEN :startOfMonth AND :endOfMonth', {
        startOfMonth,
        endOfMonth
      });
    } else if (startDate && endDate) {
      query.andWhere('payout.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    } else if (startDate) {
      query.andWhere('payout.created_at >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('payout.created_at <= :endDate', { endDate });
    }

    query.orderBy('payout.created_at', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updatePayout(id: string, data: Partial<AffiliatePayout>): Promise<void> {
    await this.payoutRepo.update(id, data);
  }

  // Affiliate User Methods
  async getAffiliateUsers(params: GetAffiliateUsersDto): Promise<{
    items: AffiliateUser[];
    total: number;
  }> {
    const {
      status,
      search,
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = params;

    const query = this.affiliateUserRepo.createQueryBuilder('affiliate')
      .leftJoinAndSelect('affiliate.user', 'user');

    if (status) {
      query.andWhere('affiliate.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(affiliate.referralCode LIKE :search OR ' +
        'affiliate.websiteUrl LIKE :search OR ' +
        'user.name LIKE :search OR ' +
        'user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    query.orderBy(`affiliate.${orderBy}`, orderDirection);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updateAffiliateUserStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended',
    reason?: string
  ): Promise<void> {
    const updateData: any = { status };
    if (reason) {
      updateData.metadata = () => 
        `jsonb_set(COALESCE(metadata, '{}'), '{suspensionReason}', '"${reason}"')`;
    }
    
    await this.affiliateUserRepo.update(id, updateData);
  }

  // Audit Log Methods
  async createAuditLog(data: Partial<AffiliateAuditLog>): Promise<void> {
    const log = this.auditLogRepo.create(data);
    await this.auditLogRepo.save(log);
  }

  async getAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AffiliateAuditLog[]> {
    return await this.auditLogRepo.find({
      where: { entityType: entityType as any, entityId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  // Dashboard Stats
  async getDashboardStats(period?: { start: Date; end: Date }): Promise<{
    totalAffiliates: number;
    activeAffiliates: number;
    totalCommissions: number;
    pendingCommissions: number;
    totalRevenue: number;
    totalPaidOut: number;
    pendingPayouts: number;
    averageCommissionRate: number;
  }> {
    const affiliateQuery = this.affiliateUserRepo.createQueryBuilder('affiliate');
    const commissionQuery = this.commissionRepo.createQueryBuilder('commission');
    const payoutQuery = this.payoutRepo.createQueryBuilder('payout');

    if (period) {
      commissionQuery.andWhere('commission.created_at BETWEEN :start AND :end', period);
      payoutQuery.andWhere('payout.created_at BETWEEN :start AND :end', period);
    }

    const [
      affiliateStats,
      commissionStats,
      payoutStats
    ] = await Promise.all([
      affiliateQuery
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(CASE WHEN status = \'active\' THEN 1 END)', 'active')
        .addSelect('AVG(commission_rate)', 'avgRate')
        .getRawOne(),
      
      commissionQuery
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(CASE WHEN status = \'pending\' THEN 1 END)', 'pending')
        .addSelect('SUM(amount)', 'totalAmount')
        .addSelect('SUM(CASE WHEN status = \'paid\' THEN amount ELSE 0 END)', 'paidAmount')
        .getRawOne(),
      
      payoutQuery
        .select('COUNT(CASE WHEN status = \'pending\' THEN 1 END)', 'pending')
        .addSelect('SUM(CASE WHEN status = \'completed\' THEN amount ELSE 0 END)', 'totalPaid')
        .getRawOne()
    ]);

    return {
      totalAffiliates: parseInt(affiliateStats.total) || 0,
      activeAffiliates: parseInt(affiliateStats.active) || 0,
      totalCommissions: parseInt(commissionStats.total) || 0,
      pendingCommissions: parseInt(commissionStats.pending) || 0,
      totalRevenue: parseFloat(commissionStats.totalAmount) || 0,
      totalPaidOut: parseFloat(payoutStats.totalPaid) || 0,
      pendingPayouts: parseInt(payoutStats.pending) || 0,
      averageCommissionRate: parseFloat(affiliateStats.avgRate) || 10
    };
  }

  async getTopPerformers(limit: number = 10, period?: { start: Date; end: Date }): Promise<any[]> {
    const query = this.affiliateUserRepo.createQueryBuilder('affiliate')
      .leftJoinAndSelect('affiliate.user', 'user')
      .leftJoin('affiliate.conversions', 'conversion')
      .leftJoin('affiliate.clicks', 'click');

    if (period) {
      query
        .andWhere('conversion.created_at BETWEEN :start AND :end OR conversion.id IS NULL', period)
        .andWhere('click.created_at BETWEEN :start AND :end OR click.id IS NULL', period);
    }

    return await query
      .select('affiliate.id', 'id')
      .addSelect('affiliate.referralCode', 'referralCode')
      .addSelect('user.name', 'name')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(DISTINCT click.id)', 'clicks')
      .addSelect('COUNT(DISTINCT conversion.id)', 'conversions')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'revenue')
      .addSelect('COALESCE(SUM(conversion.commissionAmount), 0)', 'commission')
      .groupBy('affiliate.id')
      .addGroupBy('user.id')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}