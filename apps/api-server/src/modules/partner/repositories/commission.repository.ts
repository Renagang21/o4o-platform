import { Repository, In, Between, MoreThanOrEqual, LessThanOrEqual, Like } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { PartnerCommission } from '../../../entities/partner/PartnerCommission';
import { PartnerPayout } from '../../../entities/partner/PartnerPayout';
import { PartnerAuditLog } from '../../../entities/partner/PartnerAuditLog';
import { GetCommissionsDto, GetPayoutsDto, GetPartnerUsersDto } from '../dto/commission.dto';
import { PartnerUser } from '../../../entities/partner/PartnerUser';

export class CommissionRepository {
  private commissionRepo: Repository<PartnerCommission>;
  private payoutRepo: Repository<PartnerPayout>;
  private auditLogRepo: Repository<PartnerAuditLog>;
  private partnerUserRepo: Repository<PartnerUser>;

  constructor() {
    this.commissionRepo = AppDataSource.getRepository(PartnerCommission);
    this.payoutRepo = AppDataSource.getRepository(PartnerPayout);
    this.auditLogRepo = AppDataSource.getRepository(PartnerAuditLog);
    this.partnerUserRepo = AppDataSource.getRepository(PartnerUser);
  }

  // Commission Methods
  async createCommission(data: Partial<PartnerCommission>): Promise<PartnerCommission> {
    const commission = this.commissionRepo.create(data);
    return await this.commissionRepo.save(commission);
  }

  async findCommissionById(id: string): Promise<PartnerCommission | null> {
    return await this.commissionRepo.findOne({
      where: { id },
      relations: ['partnerUser', 'conversion']
    });
  }

  async findCommissionByConversionId(conversionId: string): Promise<PartnerCommission | null> {
    return await this.commissionRepo.findOne({
      where: { conversionId },
      relations: ['partnerUser']
    });
  }

  async findCommissionsByIds(ids: string[]): Promise<PartnerCommission[]> {
    return await this.commissionRepo.find({
      where: { id: In(ids) },
      relations: ['partnerUser', 'conversion']
    });
  }

  async getCommissions(params: GetCommissionsDto): Promise<{
    items: PartnerCommission[];
    total: number;
  }> {
    const {
      partnerUserId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'DESC'
    } = params;

    const query = this.commissionRepo.createQueryBuilder('commission')
      .leftJoinAndSelect('commission.partnerUser', 'partnerUser')
      .leftJoinAndSelect('commission.conversion', 'conversion');

    if (partnerUserId) {
      query.andWhere('commission.partnerUserId = :partnerUserId', { partnerUserId });
    }

    if (status) {
      query.andWhere('commission.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('commission.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    } else if (startDate) {
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    query.orderBy(`commission.${orderBy}`, orderDirection);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updateCommission(id: string, data: Partial<PartnerCommission>): Promise<void> {
    await this.commissionRepo.update(id, data);
  }

  async updateCommissions(ids: string[], data: Partial<PartnerCommission>): Promise<void> {
    await this.commissionRepo.update({ id: In(ids) }, data);
  }

  async getCommissionStats(partnerUserId?: string, period?: { start: Date; end: Date }): Promise<{
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    totalRejected: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  }> {
    const query = this.commissionRepo.createQueryBuilder('commission');

    if (partnerUserId) {
      query.andWhere('commission.partnerUserId = :partnerUserId', { partnerUserId });
    }

    if (period) {
      query.andWhere('commission.createdAt BETWEEN :start AND :end', period);
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
  async createPayout(data: Partial<PartnerPayout>): Promise<PartnerPayout> {
    const payout = this.payoutRepo.create(data);
    return await this.payoutRepo.save(payout);
  }

  async findPayoutById(id: string): Promise<PartnerPayout | null> {
    return await this.payoutRepo.findOne({
      where: { id },
      relations: ['partnerUser']
    });
  }

  async getPayouts(params: GetPayoutsDto): Promise<{
    items: PartnerPayout[];
    total: number;
  }> {
    const {
      partnerUserId,
      status,
      month,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = params;

    const query = this.payoutRepo.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.partnerUser', 'partnerUser');

    if (partnerUserId) {
      query.andWhere('payout.partnerUserId = :partnerUserId', { partnerUserId });
    }

    if (status) {
      query.andWhere('payout.status = :status', { status });
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      query.andWhere('payout.createdAt BETWEEN :startOfMonth AND :endOfMonth', {
        startOfMonth,
        endOfMonth
      });
    } else if (startDate && endDate) {
      query.andWhere('payout.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    } else if (startDate) {
      query.andWhere('payout.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('payout.createdAt <= :endDate', { endDate });
    }

    query.orderBy('payout.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updatePayout(id: string, data: Partial<PartnerPayout>): Promise<void> {
    await this.payoutRepo.update(id, data);
  }

  // Partner User Methods
  async getPartnerUsers(params: GetPartnerUsersDto): Promise<{
    items: PartnerUser[];
    total: number;
  }> {
    const {
      status,
      search,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'DESC'
    } = params;

    const query = this.partnerUserRepo.createQueryBuilder('partner')
      .leftJoinAndSelect('partner.user', 'user');

    if (status) {
      query.andWhere('partner.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(partner.referralCode LIKE :search OR ' +
        'partner.websiteUrl LIKE :search OR ' +
        'user.name LIKE :search OR ' +
        'user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    query.orderBy(`partner.${orderBy}`, orderDirection);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updatePartnerUserStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended',
    reason?: string
  ): Promise<void> {
    const updateData: any = { status };
    if (reason) {
      updateData.metadata = () => 
        `jsonb_set(COALESCE(metadata, '{}'), '{suspensionReason}', '"${reason}"')`;
    }
    
    await this.partnerUserRepo.update(id, updateData);
  }

  // Audit Log Methods
  async createAuditLog(data: Partial<PartnerAuditLog>): Promise<void> {
    const log = this.auditLogRepo.create(data);
    await this.auditLogRepo.save(log);
  }

  async getAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<PartnerAuditLog[]> {
    return await this.auditLogRepo.find({
      where: { entityType: entityType as any, entityId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  // Dashboard Stats
  async getDashboardStats(period?: { start: Date; end: Date }): Promise<{
    totalPartners: number;
    activePartners: number;
    totalCommissions: number;
    pendingCommissions: number;
    totalRevenue: number;
    totalPaidOut: number;
    pendingPayouts: number;
    averageCommissionRate: number;
  }> {
    const partnerQuery = this.partnerUserRepo.createQueryBuilder('partner');
    const commissionQuery = this.commissionRepo.createQueryBuilder('commission');
    const payoutQuery = this.payoutRepo.createQueryBuilder('payout');

    if (period) {
      commissionQuery.andWhere('commission.createdAt BETWEEN :start AND :end', period);
      payoutQuery.andWhere('payout.createdAt BETWEEN :start AND :end', period);
    }

    const [
      partnerStats,
      commissionStats,
      payoutStats
    ] = await Promise.all([
      partnerQuery
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
      totalPartners: parseInt(partnerStats.total) || 0,
      activePartners: parseInt(partnerStats.active) || 0,
      totalCommissions: parseInt(commissionStats.total) || 0,
      pendingCommissions: parseInt(commissionStats.pending) || 0,
      totalRevenue: parseFloat(commissionStats.totalAmount) || 0,
      totalPaidOut: parseFloat(payoutStats.totalPaid) || 0,
      pendingPayouts: parseInt(payoutStats.pending) || 0,
      averageCommissionRate: parseFloat(partnerStats.avgRate) || 10
    };
  }

  async getTopPerformers(limit: number = 10, period?: { start: Date; end: Date }): Promise<any[]> {
    const query = this.partnerUserRepo.createQueryBuilder('partner')
      .leftJoinAndSelect('partner.user', 'user')
      .leftJoin('partner.conversions', 'conversion')
      .leftJoin('partner.clicks', 'click');

    if (period) {
      query
        .andWhere('conversion.createdAt BETWEEN :start AND :end OR conversion.id IS NULL', period)
        .andWhere('click.createdAt BETWEEN :start AND :end OR click.id IS NULL', period);
    }

    return await query
      .select('partner.id', 'id')
      .addSelect('partner.referralCode', 'referralCode')
      .addSelect('user.name', 'name')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(DISTINCT click.id)', 'clicks')
      .addSelect('COUNT(DISTINCT conversion.id)', 'conversions')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'revenue')
      .addSelect('COALESCE(SUM(conversion.commissionAmount), 0)', 'commission')
      .groupBy('partner.id')
      .addGroupBy('user.id')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}