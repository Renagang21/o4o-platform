import { CommissionRepository } from '../repositories/commission.repository';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { 
  CalculateCommissionDto, 
  ProcessCommissionsDto,
  GetCommissionsDto,
  UpdateAffiliateStatusDto,
  GetAffiliateUsersDto,
  AdminDashboardQueryDto
} from '../dto/commission.dto';
import { AffiliateCommission } from '../../../entities/affiliate/AffiliateCommission';
import { AffiliateConversion } from '../../../entities/affiliate/AffiliateConversion';
import { RedisService } from '../../../services/redis.service';

export class CommissionService {
  private commissionRepo: CommissionRepository;
  private affiliateRepo: AffiliateRepository;
  private redisService: RedisService;

  constructor() {
    this.commissionRepo = new CommissionRepository();
    this.affiliateRepo = new AffiliateRepository();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Calculate commission for a conversion
   */
  async calculateCommission(data: CalculateCommissionDto): Promise<AffiliateCommission> {
    // Check if commission already exists for this conversion
    const existingCommission = await this.commissionRepo.findCommissionByConversionId(data.conversionId);
    if (existingCommission) {
      throw new Error('Commission already calculated for this conversion');
    }

    // Get conversion details
    const conversion = await this.affiliateRepo.findConversionById(data.conversionId);
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    // Get affiliate user
    const affiliateUser = await this.affiliateRepo.findAffiliateUserById(conversion.affiliateUserId);
    if (!affiliateUser || affiliateUser.status !== 'active') {
      throw new Error('Affiliate user not found or inactive');
    }

    // Calculate commission amount
    const commissionAmount = (data.orderAmount * affiliateUser.commissionRate) / 100;

    // Create commission record
    const commission = await this.commissionRepo.createCommission({
      affiliateUserId: affiliateUser.id,
      conversionId: data.conversionId,
      amount: commissionAmount,
      commissionRate: affiliateUser.commissionRate,
      orderId: data.orderId || conversion.orderId,
      status: 'pending',
      metadata: data.metadata
    });

    // Update affiliate earnings
    await this.affiliateRepo.updateAffiliateEarnings(
      affiliateUser.id,
      commissionAmount,
      'pending'
    );

    // Create audit log
    await this.logAction('commission', commission.id, 'created', null, {
      amount: commissionAmount,
      rate: affiliateUser.commissionRate,
      conversionId: data.conversionId
    });

    // Clear cache
    await this.clearAffiliateCache(affiliateUser.id);

    return commission;
  }

  /**
   * Process multiple commissions (approve, reject, or pay)
   */
  async processCommissions(data: ProcessCommissionsDto, userId: string): Promise<{
    processed: number;
    failed: number;
    results: any[];
  }> {
    const { commissionIds, action, reason, paymentReference, notes } = data;

    // Get all commissions
    const commissions = await this.commissionRepo.findCommissionsByIds(commissionIds);
    
    if (commissions.length === 0) {
      throw new Error('No commissions found');
    }

    const results = [];
    let processed = 0;
    let failed = 0;

    for (const commission of commissions) {
      try {
        const previousData = { ...commission };
        let updateData: any = {};

        switch (action) {
          case 'approve':
            if (commission.status !== 'pending') {
              throw new Error(`Commission ${commission.id} is not pending`);
            }
            updateData = {
              status: 'approved',
              approvedAt: new Date(),
              approvedBy: userId,
              notes
            };
            break;

          case 'reject':
            if (commission.status !== 'pending') {
              throw new Error(`Commission ${commission.id} is not pending`);
            }
            updateData = {
              status: 'rejected',
              rejectionReason: reason,
              notes
            };
            // Reverse the pending earnings
            await this.affiliateRepo.updateAffiliateEarnings(
              commission.affiliateUserId,
              -commission.amount,
              'pending'
            );
            break;

          case 'pay':
            if (commission.status !== 'approved') {
              throw new Error(`Commission ${commission.id} is not approved`);
            }
            updateData = {
              status: 'paid',
              paidAt: new Date(),
              paymentReference,
              notes
            };
            // Move from pending to paid earnings
            await this.affiliateRepo.updateAffiliateEarnings(
              commission.affiliateUserId,
              commission.amount,
              'paid'
            );
            break;

          default:
            throw new Error(`Invalid action: ${action}`);
        }

        await this.commissionRepo.updateCommission(commission.id, updateData);

        // Log action
        await this.logAction(
          'commission',
          commission.id,
          action,
          previousData,
          updateData,
          userId
        );

        results.push({
          id: commission.id,
          success: true,
          message: `Commission ${action}ed successfully`
        });
        processed++;

      } catch (error: any) {
        results.push({
          id: commission.id,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    // Clear cache for affected affiliates
    const uniqueAffiliateIds = [...new Set(commissions.map(c => c.affiliateUserId))];
    for (const affiliateId of uniqueAffiliateIds) {
      await this.clearAffiliateCache(affiliateId);
    }

    return { processed, failed, results };
  }

  /**
   * Get commissions with filtering and pagination
   */
  async getCommissions(params: GetCommissionsDto): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const { items, total } = await this.commissionRepo.getCommissions(params);

    const formattedItems = items.map(commission => ({
      id: commission.id,
      affiliateUserId: commission.affiliateUserId,
      affiliateName: commission.affiliateUser?.user?.name,
      affiliateEmail: commission.affiliateUser?.user?.email,
      referralCode: commission.affiliateUser?.referralCode,
      amount: commission.amount,
      commissionRate: commission.commissionRate,
      status: commission.status,
      orderId: commission.orderId,
      conversionId: commission.conversionId,
      approvedAt: commission.approvedAt,
      paidAt: commission.paidAt,
      paymentReference: commission.paymentReference,
      notes: commission.notes,
      rejectionReason: commission.rejectionReason,
      createdAt: commission.created_at,
      updatedAt: commission.updated_at
    }));

    return {
      items: formattedItems,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get affiliate users for admin
   */
  async getAffiliateUsers(params: GetAffiliateUsersDto): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const { items, total } = await this.commissionRepo.getAffiliateUsers(params);

    const formattedItems = items.map(affiliate => ({
      id: affiliate.id,
      userId: affiliate.userId,
      name: affiliate.user?.name,
      email: affiliate.user?.email,
      referralCode: affiliate.referralCode,
      status: affiliate.status,
      commissionRate: affiliate.commissionRate,
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      totalEarnings: affiliate.totalEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      paidEarnings: affiliate.paidEarnings,
      websiteUrl: affiliate.websiteUrl,
      description: affiliate.description,
      lastClickAt: affiliate.lastClickAt,
      lastConversionAt: affiliate.lastConversionAt,
      createdAt: affiliate.created_at,
      updatedAt: affiliate.updated_at
    }));

    return {
      items: formattedItems,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update affiliate user status
   */
  async updateAffiliateStatus(
    affiliateId: string,
    data: UpdateAffiliateStatusDto,
    adminId: string
  ): Promise<void> {
    const affiliate = await this.affiliateRepo.findAffiliateUserById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate user not found');
    }

    const previousData = { status: affiliate.status };
    
    await this.commissionRepo.updateAffiliateUserStatus(
      affiliateId,
      data.status,
      data.reason
    );

    // Log action
    await this.logAction(
      'affiliate_user',
      affiliateId,
      `status_changed_to_${data.status}`,
      previousData,
      { status: data.status, reason: data.reason },
      adminId
    );

    // Clear cache
    await this.clearAffiliateCache(affiliateId);
  }

  /**
   * Get admin dashboard stats
   */
  async getAdminDashboard(params: AdminDashboardQueryDto): Promise<{
    stats: any;
    recentActivity: any[];
    topPerformers: any[];
    commissionBreakdown: any;
  }> {
    // Determine period
    let period: { start: Date; end: Date } | undefined;
    
    if (params.startDate && params.endDate) {
      period = { start: params.startDate, end: params.endDate };
    } else if (params.period) {
      const now = new Date();
      const start = new Date();
      
      switch (params.period) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          period = undefined;
          break;
      }
      
      if (params.period !== 'all') {
        period = { start, end: now };
      }
    }

    // Get stats
    const [
      dashboardStats,
      commissionStats,
      topPerformers,
      recentCommissions
    ] = await Promise.all([
      this.commissionRepo.getDashboardStats(period),
      this.commissionRepo.getCommissionStats(undefined, period),
      this.commissionRepo.getTopPerformers(10, period),
      this.commissionRepo.getCommissions({
        page: 1,
        limit: 10,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      })
    ]);

    // Get recent activity from audit logs
    const recentActivity = await this.commissionRepo.getAuditLogs('commission', '', 20);

    return {
      stats: {
        ...dashboardStats,
        conversionRate: dashboardStats.totalAffiliates > 0
          ? (dashboardStats.activeAffiliates / dashboardStats.totalAffiliates) * 100
          : 0
      },
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userEmail: log.userEmail,
        description: log.description,
        createdAt: log.created_at
      })),
      topPerformers,
      commissionBreakdown: {
        pending: commissionStats.pendingAmount,
        approved: commissionStats.approvedAmount,
        paid: commissionStats.paidAmount,
        total: commissionStats.pendingAmount + commissionStats.approvedAmount + commissionStats.paidAmount
      }
    };
  }

  /**
   * Get commission statistics
   */
  async getCommissionStats(affiliateUserId?: string): Promise<any> {
    return await this.commissionRepo.getCommissionStats(affiliateUserId);
  }

  // Helper methods
  private async logAction(
    entityType: string,
    entityId: string,
    action: string,
    previousData: any,
    newData: any,
    userId?: string
  ): Promise<void> {
    await this.commissionRepo.createAuditLog({
      entityType: entityType as any,
      entityId,
      action,
      userId,
      userRole: userId ? 'admin' : 'system',
      previousData,
      newData,
      changes: this.getChanges(previousData, newData)
    });
  }

  private getChanges(previousData: any, newData: any): any {
    if (!previousData) return newData;
    
    const changes: any = {};
    for (const key in newData) {
      if (previousData[key] !== newData[key]) {
        changes[key] = {
          from: previousData[key],
          to: newData[key]
        };
      }
    }
    return changes;
  }

  private async clearAffiliateCache(affiliateId: string): Promise<void> {
    const keys = [
      `affiliate:user:${affiliateId}`,
      `affiliate:stats:${affiliateId}`,
      `affiliate:commissions:${affiliateId}`
    ];
    
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}