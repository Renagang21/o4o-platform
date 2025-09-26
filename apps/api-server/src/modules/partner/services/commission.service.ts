import { CommissionRepository } from '../repositories/commission.repository';
import { PartnerRepository } from '../repositories/partner.repository';
import { 
  CalculateCommissionDto, 
  ProcessCommissionsDto,
  GetCommissionsDto,
  UpdatePartnerStatusDto,
  GetPartnerUsersDto,
  AdminDashboardQueryDto
} from '../dto/commission.dto';
import { PartnerCommission } from '../../../entities/partner/PartnerCommission';
import { PartnerConversion } from '../../../entities/partner/PartnerConversion';
import { RedisService } from '../../../services/redis.service';

export class CommissionService {
  private commissionRepo: CommissionRepository;
  private partnerRepo: PartnerRepository;
  private redisService: RedisService;

  constructor() {
    this.commissionRepo = new CommissionRepository();
    this.partnerRepo = new PartnerRepository();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Calculate commission for a conversion
   */
  async calculateCommission(data: CalculateCommissionDto): Promise<PartnerCommission> {
    // Check if commission already exists for this conversion
    const existingCommission = await this.commissionRepo.findCommissionByConversionId(data.conversionId);
    if (existingCommission) {
      throw new Error('Commission already calculated for this conversion');
    }

    // Get conversion details
    const conversion = await this.partnerRepo.findConversionById(data.conversionId);
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    // Get partner user
    const partnerUser = await this.partnerRepo.findPartnerUserById(conversion.partnerUserId);
    if (!partnerUser || partnerUser.status !== 'active') {
      throw new Error('Partner user not found or inactive');
    }

    // Calculate commission amount
    const commissionAmount = (data.orderAmount * partnerUser.commissionRate) / 100;

    // Create commission record
    const commission = await this.commissionRepo.createCommission({
      partnerUserId: partnerUser.id,
      conversionId: data.conversionId,
      amount: commissionAmount,
      commissionRate: partnerUser.commissionRate,
      orderId: data.orderId || conversion.orderId,
      status: 'pending',
      metadata: data.metadata
    });

    // Update partner earnings
    await this.partnerRepo.updatePartnerEarnings(
      partnerUser.id,
      commissionAmount,
      'pending'
    );

    // Create audit log
    await this.logAction('commission', commission.id, 'created', null, {
      amount: commissionAmount,
      rate: partnerUser.commissionRate,
      conversionId: data.conversionId
    });

    // Clear cache
    await this.clearPartnerCache(partnerUser.id);

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
            await this.partnerRepo.updatePartnerEarnings(
              commission.partnerUserId,
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
            await this.partnerRepo.updatePartnerEarnings(
              commission.partnerUserId,
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

    // Clear cache for affected partners
    const uniquePartnerIds = [...new Set(commissions.map(c => c.partnerUserId))];
    for (const partnerId of uniquePartnerIds) {
      await this.clearPartnerCache(partnerId);
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
      partnerUserId: commission.partnerUserId,
      partnerName: commission.partnerUser?.user?.name,
      partnerEmail: commission.partnerUser?.user?.email,
      referralCode: commission.partnerUser?.referralCode,
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
      createdAt: commission.createdAt,
      updatedAt: commission.updatedAt
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
   * Get partner users for admin
   */
  async getPartnerUsers(params: GetPartnerUsersDto): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const { items, total } = await this.commissionRepo.getPartnerUsers(params);

    const formattedItems = items.map(partner => ({
      id: partner.id,
      userId: partner.userId,
      name: partner.user?.name,
      email: partner.user?.email,
      referralCode: partner.referralCode,
      status: partner.status,
      commissionRate: partner.commissionRate,
      totalClicks: partner.totalClicks,
      totalConversions: partner.totalConversions,
      totalEarnings: partner.totalEarnings,
      pendingEarnings: partner.pendingEarnings,
      paidEarnings: partner.paidEarnings,
      websiteUrl: partner.websiteUrl,
      description: partner.description,
      lastClickAt: partner.lastClickAt,
      lastConversionAt: partner.lastConversionAt,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt
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
   * Update partner user status
   */
  async updatePartnerStatus(
    partnerId: string,
    data: UpdatePartnerStatusDto,
    adminId: string
  ): Promise<void> {
    const partner = await this.partnerRepo.findPartnerUserById(partnerId);
    if (!partner) {
      throw new Error('Partner user not found');
    }

    const previousData = { status: partner.status };
    
    await this.commissionRepo.updatePartnerUserStatus(
      partnerId,
      data.status,
      data.reason
    );

    // Log action
    await this.logAction(
      'partner_user',
      partnerId,
      `status_changed_to_${data.status}`,
      previousData,
      { status: data.status, reason: data.reason },
      adminId
    );

    // Clear cache
    await this.clearPartnerCache(partnerId);
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
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      })
    ]);

    // Get recent activity from audit logs
    const recentActivity = await this.commissionRepo.getAuditLogs('commission', '', 20);

    return {
      stats: {
        ...dashboardStats,
        conversionRate: dashboardStats.totalPartners > 0
          ? (dashboardStats.activePartners / dashboardStats.totalPartners) * 100
          : 0
      },
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userEmail: log.userEmail,
        description: log.description,
        createdAt: log.createdAt
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
  async getCommissionStats(partnerUserId?: string): Promise<any> {
    return await this.commissionRepo.getCommissionStats(partnerUserId);
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

  private async clearPartnerCache(partnerId: string): Promise<void> {
    const keys = [
      `partner:user:${partnerId}`,
      `partner:stats:${partnerId}`,
      `partner:commissions:${partnerId}`
    ];
    
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}