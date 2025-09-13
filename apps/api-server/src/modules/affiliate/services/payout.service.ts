import { CommissionRepository } from '../repositories/commission.repository';
import { CreatePayoutDto, GetPayoutsDto } from '../dto/commission.dto';
import { AffiliatePayout } from '../../../entities/affiliate/AffiliatePayout';
import { RedisService } from '../../../services/redis.service';

export class PayoutService {
  private commissionRepo: CommissionRepository;
  private redisService: RedisService;

  constructor() {
    this.commissionRepo = new CommissionRepository();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a payout for approved commissions
   */
  async createPayout(data: CreatePayoutDto, adminId: string): Promise<AffiliatePayout> {
    const { affiliateUserId, commissionIds, paymentMethod, bankAccount, paymentDetails, notes } = data;

    // Validate all commissions belong to the affiliate and are approved
    const commissions = await this.commissionRepo.findCommissionsByIds(commissionIds);
    
    if (commissions.length !== commissionIds.length) {
      throw new Error('Some commissions not found');
    }

    // Validate all commissions
    const invalidCommissions = [];
    let totalAmount = 0;

    for (const commission of commissions) {
      if (commission.affiliateUserId !== affiliateUserId) {
        invalidCommissions.push({
          id: commission.id,
          reason: 'Commission does not belong to this affiliate'
        });
      } else if (commission.status !== 'approved') {
        invalidCommissions.push({
          id: commission.id,
          reason: `Commission is ${commission.status}, not approved`
        });
      } else if (commission.payoutId) {
        invalidCommissions.push({
          id: commission.id,
          reason: 'Commission already included in another payout'
        });
      } else {
        totalAmount += Number(commission.amount);
      }
    }

    if (invalidCommissions.length > 0) {
      throw new Error(`Invalid commissions: ${JSON.stringify(invalidCommissions)}`);
    }

    if (totalAmount <= 0) {
      throw new Error('Total payout amount must be greater than 0');
    }

    // Create payout record
    const payout = await this.commissionRepo.createPayout({
      affiliateUserId,
      amount: totalAmount,
      commissionIds,
      paymentMethod,
      bankAccount,
      paymentDetails,
      status: 'pending',
      currency: 'USD',
      netAmount: totalAmount, // Can be adjusted after fees
      notes,
      metadata: {
        createdBy: adminId,
        commissionCount: commissionIds.length
      } as any
    });

    // Update commissions with payout ID
    await this.commissionRepo.updateCommissions(commissionIds, {
      payoutId: payout.id
    });

    // Log action
    await this.logAction('payout', payout.id, 'created', null, {
      amount: totalAmount,
      commissionCount: commissionIds.length,
      paymentMethod
    }, adminId);

    // Clear cache
    await this.clearCache(affiliateUserId);

    return payout;
  }

  /**
   * Process a payout (mark as processing, completed, or failed)
   */
  async processPayout(
    payoutId: string,
    status: 'processing' | 'completed' | 'failed',
    transactionId?: string,
    failureReason?: string,
    adminId?: string
  ): Promise<AffiliatePayout> {
    const payout = await this.commissionRepo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error('Payout not found');
    }

    const previousData = { ...payout };
    const updateData: any = { status };
    const now = new Date();

    switch (status) {
      case 'processing':
        if (payout.status !== 'pending') {
          throw new Error('Only pending payouts can be marked as processing');
        }
        updateData.processedAt = now;
        updateData.processedBy = adminId;
        break;

      case 'completed':
        if (!['pending', 'processing'].includes(payout.status)) {
          throw new Error('Only pending or processing payouts can be completed');
        }
        if (!transactionId) {
          throw new Error('Transaction ID is required for completed payouts');
        }
        updateData.transactionId = transactionId;
        updateData.paidAt = now;
        
        // Mark all associated commissions as paid
        await this.commissionRepo.updateCommissions(payout.commissionIds, {
          status: 'paid',
          paidAt: now,
          paymentReference: transactionId
        });
        break;

      case 'failed':
        if (!['pending', 'processing'].includes(payout.status)) {
          throw new Error('Only pending or processing payouts can be marked as failed');
        }
        if (!failureReason) {
          throw new Error('Failure reason is required');
        }
        updateData.failureReason = failureReason;
        
        // Remove payout ID from commissions
        await this.commissionRepo.updateCommissions(payout.commissionIds, {
          payoutId: null
        });
        break;
    }

    await this.commissionRepo.updatePayout(payoutId, updateData);

    // Log action
    await this.logAction(
      'payout',
      payoutId,
      `status_changed_to_${status}`,
      previousData,
      updateData,
      adminId
    );

    // Clear cache
    await this.clearCache(payout.affiliateUserId);

    // Return updated payout
    const updatedPayout = await this.commissionRepo.findPayoutById(payoutId);
    if (!updatedPayout) {
      throw new Error('Failed to retrieve updated payout');
    }

    return updatedPayout;
  }

  /**
   * Cancel a pending payout
   */
  async cancelPayout(payoutId: string, reason: string, adminId: string): Promise<void> {
    const payout = await this.commissionRepo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error('Only pending payouts can be cancelled');
    }

    // Update payout status
    await this.commissionRepo.updatePayout(payoutId, {
      status: 'cancelled',
      failureReason: reason
    });

    // Remove payout ID from commissions
    await this.commissionRepo.updateCommissions(payout.commissionIds, {
      payoutId: null
    });

    // Log action
    await this.logAction('payout', payoutId, 'cancelled', payout, { reason }, adminId);

    // Clear cache
    await this.clearCache(payout.affiliateUserId);
  }

  /**
   * Get payouts with filtering and pagination
   */
  async getPayouts(params: GetPayoutsDto): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const { items, total } = await this.commissionRepo.getPayouts(params);

    const formattedItems = items.map(payout => ({
      id: payout.id,
      affiliateUserId: payout.affiliateUserId,
      affiliateName: payout.affiliateUser?.user?.name,
      affiliateEmail: payout.affiliateUser?.user?.email,
      amount: payout.amount,
      fees: payout.fees,
      netAmount: payout.netAmount,
      currency: payout.currency,
      commissionCount: payout.commissionIds.length,
      paymentMethod: payout.paymentMethod,
      status: payout.status,
      transactionId: payout.transactionId,
      bankAccount: payout.bankAccount,
      paymentDetails: payout.paymentDetails,
      processedAt: payout.processedAt,
      paidAt: payout.paidAt,
      failureReason: payout.failureReason,
      notes: payout.notes,
      createdAt: payout.created_at,
      updatedAt: payout.updated_at
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
   * Get payout details with associated commissions
   */
  async getPayoutDetails(payoutId: string): Promise<{
    payout: any;
    commissions: any[];
  }> {
    const payout = await this.commissionRepo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error('Payout not found');
    }

    const commissions = await this.commissionRepo.findCommissionsByIds(payout.commissionIds);

    return {
      payout: {
        id: payout.id,
        affiliateUserId: payout.affiliateUserId,
        affiliateName: payout.affiliateUser?.user?.name,
        affiliateEmail: payout.affiliateUser?.user?.email,
        amount: payout.amount,
        fees: payout.fees,
        netAmount: payout.netAmount,
        currency: payout.currency,
        paymentMethod: payout.paymentMethod,
        status: payout.status,
        transactionId: payout.transactionId,
        bankAccount: payout.bankAccount,
        paymentDetails: payout.paymentDetails,
        processedAt: payout.processedAt,
        paidAt: payout.paidAt,
        failureReason: payout.failureReason,
        notes: payout.notes,
        createdAt: payout.created_at,
        updatedAt: payout.updated_at
      },
      commissions: commissions.map(c => ({
        id: c.id,
        amount: c.amount,
        commissionRate: c.commissionRate,
        orderId: c.orderId,
        status: c.status,
        createdAt: c.created_at
      }))
    };
  }

  /**
   * Calculate payout summary for an affiliate
   */
  async calculatePayoutSummary(affiliateUserId: string): Promise<{
    eligibleCommissions: any[];
    totalAmount: number;
    commissionCount: number;
    canCreatePayout: boolean;
    reason?: string;
  }> {
    // Get approved commissions without payout
    const { items: commissions } = await this.commissionRepo.getCommissions({
      affiliateUserId,
      status: 'approved',
      page: 1,
      limit: 1000
    });

    const eligibleCommissions = commissions.filter(c => !c.payoutId);
    const totalAmount = eligibleCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    let canCreatePayout = true;
    let reason;

    if (eligibleCommissions.length === 0) {
      canCreatePayout = false;
      reason = 'No eligible commissions for payout';
    } else if (totalAmount < 50) { // Minimum payout threshold
      canCreatePayout = false;
      reason = `Minimum payout amount is $50. Current eligible amount: $${totalAmount.toFixed(2)}`;
    }

    // Check for pending payouts
    const { items: pendingPayouts } = await this.commissionRepo.getPayouts({
      affiliateUserId,
      status: 'pending',
      page: 1,
      limit: 1
    });

    if (pendingPayouts.length > 0) {
      canCreatePayout = false;
      reason = 'There is already a pending payout for this affiliate';
    }

    return {
      eligibleCommissions: eligibleCommissions.map(c => ({
        id: c.id,
        amount: c.amount,
        orderId: c.orderId,
        createdAt: c.created_at
      })),
      totalAmount,
      commissionCount: eligibleCommissions.length,
      canCreatePayout,
      reason
    };
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

  private async clearCache(affiliateUserId: string): Promise<void> {
    const keys = [
      `affiliate:payouts:${affiliateUserId}`,
      `affiliate:commissions:${affiliateUserId}`,
      `affiliate:stats:${affiliateUserId}`
    ];
    
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}