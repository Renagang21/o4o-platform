import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Commission, CommissionStatus } from '../entities/Commission.js';
import { AuditLog, AuditChange } from '../entities/AuditLog.js';
import { ConversionEvent } from '../entities/ConversionEvent.js';
import { Partner } from '../entities/Partner.js';
import {
  NotFoundException,
  BadRequestException,
  ConflictException
} from '../exceptions/HttpExceptions.js';
import { EventEmitter } from 'events';

/**
 * OperationsService
 *
 * Handles administrative operations for commission management:
 * - Commission adjustments (amount changes)
 * - Refund processing
 * - Manual commission cancellation
 * - Batch operations
 * - Audit trail tracking
 *
 * All operations create audit log entries for compliance and transparency.
 *
 * @service Phase 2.2
 */
export class OperationsService {
  private commissionRepo: Repository<Commission>;
  private auditLogRepo: Repository<AuditLog>;
  private conversionRepo: Repository<ConversionEvent>;
  private partnerRepo: Repository<Partner>;
  private eventEmitter: EventEmitter;

  constructor() {
    this.commissionRepo = AppDataSource.getRepository(Commission);
    this.auditLogRepo = AppDataSource.getRepository(AuditLog);
    this.conversionRepo = AppDataSource.getRepository(ConversionEvent);
    this.partnerRepo = AppDataSource.getRepository(Partner);
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Get event emitter for subscribing to operations events
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Adjust commission amount
   *
   * Updates the commission amount and records the adjustment in audit trail.
   * Cannot adjust commissions that have already been paid.
   *
   * @param commissionId - Commission UUID
   * @param newAmount - New commission amount
   * @param reason - Reason for adjustment
   * @param adminId - Admin user ID making the adjustment
   * @param ipAddress - IP address of admin (optional)
   * @returns Updated commission
   */
  async adjustCommission(
    commissionId: string,
    newAmount: number,
    reason: string,
    adminId: string,
    ipAddress?: string
  ): Promise<Commission> {
    // Load commission with relations
    const commission = await this.commissionRepo.findOne({
      where: { id: commissionId },
      relations: ['partner', 'product', 'policy']
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${commissionId} not found`);
    }

    // Validate adjustment
    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException('Cannot adjust commission that has already been paid');
    }

    if (newAmount < 0) {
      throw new BadRequestException('Commission amount cannot be negative');
    }

    const oldAmount = commission.commissionAmount;

    if (oldAmount === newAmount) {
      throw new BadRequestException('New amount must be different from current amount');
    }

    // Apply adjustment
    commission.adjustAmount(newAmount, reason, adminId);

    // Save commission
    await this.commissionRepo.save(commission);

    // Create audit log
    await this.createAuditLog({
      entityType: 'commission',
      entityId: commissionId,
      action: 'adjusted',
      userId: adminId,
      changes: [{
        field: 'commissionAmount',
        oldValue: oldAmount,
        newValue: newAmount
      }],
      reason,
      ipAddress
    });

    // Emit event for webhook notification
    this.eventEmitter.emit('commission.adjusted', {
      commissionId,
      partnerId: commission.partnerId,
      oldAmount,
      newAmount,
      reason,
      adjustedBy: adminId
    });

    return commission;
  }

  /**
   * Process refund for a conversion
   *
   * Finds the commission associated with a conversion and cancels it.
   * Records refund reason in audit trail.
   *
   * @param conversionId - Conversion UUID
   * @param refundAmount - Amount refunded (informational)
   * @param reason - Reason for refund
   * @param adminId - Admin user ID processing refund
   * @param ipAddress - IP address of admin (optional)
   * @returns Cancelled commission
   */
  async processRefund(
    conversionId: string,
    refundAmount: number,
    reason: string,
    adminId: string,
    ipAddress?: string
  ): Promise<Commission> {
    // Find commission by conversion
    const commission = await this.commissionRepo.findOne({
      where: { conversionId },
      relations: ['conversion', 'partner']
    });

    if (!commission) {
      throw new NotFoundException(`Commission for conversion ${conversionId} not found`);
    }

    // Validate refund
    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException(
        'Cannot refund commission that has already been paid. Use adjustment instead.'
      );
    }

    if (commission.status === CommissionStatus.CANCELLED) {
      throw new ConflictException('Commission is already cancelled');
    }

    const oldStatus = commission.status;

    // Cancel commission
    commission.cancel(`Refund processed: ${reason}`, adminId);

    // Save commission
    await this.commissionRepo.save(commission);

    // Create audit log
    await this.createAuditLog({
      entityType: 'commission',
      entityId: commission.id,
      action: 'refunded',
      userId: adminId,
      changes: [{
        field: 'status',
        oldValue: oldStatus,
        newValue: CommissionStatus.CANCELLED
      }],
      reason: `Refund of $${refundAmount}: ${reason}`,
      ipAddress
    });

    // Emit event
    this.eventEmitter.emit('commission.refunded', {
      commissionId: commission.id,
      conversionId,
      partnerId: commission.partnerId,
      refundAmount,
      reason,
      processedBy: adminId
    });

    return commission;
  }

  /**
   * Cancel commission manually
   *
   * Cancels a commission without a refund (e.g., policy violation, fraud).
   *
   * @param commissionId - Commission UUID
   * @param reason - Reason for cancellation
   * @param adminId - Admin user ID cancelling commission
   * @param ipAddress - IP address of admin (optional)
   * @returns Cancelled commission
   */
  async cancelCommission(
    commissionId: string,
    reason: string,
    adminId: string,
    ipAddress?: string
  ): Promise<Commission> {
    const commission = await this.commissionRepo.findOne({
      where: { id: commissionId },
      relations: ['partner']
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${commissionId} not found`);
    }

    if (!commission.canCancel()) {
      throw new BadRequestException(`Cannot cancel commission in ${commission.status} status`);
    }

    const oldStatus = commission.status;

    // Cancel commission
    commission.cancel(reason, adminId);

    // Save commission
    await this.commissionRepo.save(commission);

    // Create audit log
    await this.createAuditLog({
      entityType: 'commission',
      entityId: commissionId,
      action: 'cancelled',
      userId: adminId,
      changes: [{
        field: 'status',
        oldValue: oldStatus,
        newValue: CommissionStatus.CANCELLED
      }],
      reason,
      ipAddress
    });

    // Emit event
    this.eventEmitter.emit('commission.cancelled', {
      commissionId,
      partnerId: commission.partnerId,
      reason,
      cancelledBy: adminId
    });

    return commission;
  }

  /**
   * Mark commission as paid
   *
   * Updates commission status to PAID and records payment details.
   *
   * @param commissionId - Commission UUID
   * @param paymentMethod - Payment method used
   * @param paymentReference - Payment transaction reference
   * @param adminId - Admin user ID marking as paid
   * @param ipAddress - IP address of admin (optional)
   * @returns Paid commission
   */
  async markCommissionAsPaid(
    commissionId: string,
    paymentMethod: string,
    paymentReference: string,
    adminId: string,
    ipAddress?: string
  ): Promise<Commission> {
    const commission = await this.commissionRepo.findOne({
      where: { id: commissionId },
      relations: ['partner']
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${commissionId} not found`);
    }

    if (!commission.canPay()) {
      throw new BadRequestException(
        `Cannot mark commission as paid. Current status: ${commission.status}`
      );
    }

    const oldStatus = commission.status;

    // Mark as paid
    commission.markAsPaid(paymentMethod, paymentReference);

    // Save commission
    await this.commissionRepo.save(commission);

    // Create audit log
    await this.createAuditLog({
      entityType: 'commission',
      entityId: commissionId,
      action: 'paid',
      userId: adminId,
      changes: [
        {
          field: 'status',
          oldValue: oldStatus,
          newValue: CommissionStatus.PAID
        },
        {
          field: 'paymentMethod',
          oldValue: null,
          newValue: paymentMethod
        },
        {
          field: 'paymentReference',
          oldValue: null,
          newValue: paymentReference
        }
      ],
      reason: `Payment processed via ${paymentMethod}`,
      ipAddress
    });

    // Emit event
    this.eventEmitter.emit('commission.paid', {
      commissionId,
      partnerId: commission.partnerId,
      amount: commission.commissionAmount,
      paymentMethod,
      paymentReference,
      paidBy: adminId
    });

    return commission;
  }

  /**
   * List commissions with filtering and pagination
   *
   * @param filters - Filter criteria
   * @param pagination - Page and limit
   * @returns Commissions and total count
   */
  async listCommissions(
    filters: {
      partnerId?: string;
      status?: CommissionStatus;
      dateFrom?: Date;
      dateTo?: Date;
      minAmount?: number;
      maxAmount?: number;
      search?: string; // Search by order ID or referral code
    },
    pagination: { page: number; limit: number }
  ): Promise<{
    commissions: Commission[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.commissionRepo
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.partner', 'partner')
      .leftJoinAndSelect('commission.product', 'product')
      .leftJoinAndSelect('commission.policy', 'policy');

    // Apply filters
    if (filters.partnerId) {
      queryBuilder.andWhere('commission.partnerId = :partnerId', {
        partnerId: filters.partnerId
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('commission.status = :status', {
        status: filters.status
      });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('commission.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('commission.createdAt <= :dateTo', {
        dateTo: filters.dateTo
      });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('commission.commissionAmount >= :minAmount', {
        minAmount: filters.minAmount
      });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('commission.commissionAmount <= :maxAmount', {
        maxAmount: filters.maxAmount
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(commission.orderId ILIKE :search OR commission.referralCode ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const commissions = await queryBuilder
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .orderBy('commission.createdAt', 'DESC')
      .getMany();

    return {
      commissions,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }

  /**
   * Get audit trail for an entity
   *
   * @param entityType - Type of entity (commission, conversion, etc.)
   * @param entityId - Entity UUID
   * @returns Audit log entries
   */
  async getAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get audit trail for a user (admin activity log)
   *
   * @param userId - User UUID
   * @param limit - Number of entries to return
   * @returns Audit log entries
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Get recent audit activity across all entities
   *
   * @param limit - Number of entries to return
   * @returns Audit log entries
   */
  async getRecentActivity(limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Batch confirm commissions past hold period
   *
   * Used by scheduled job to auto-confirm commissions.
   *
   * @returns Statistics about batch operation
   */
  async batchConfirmCommissions(): Promise<{
    total: number;
    confirmed: number;
    failed: number;
    errors: Array<{ commissionId: string; error: string }>;
  }> {
    // Find all pending commissions past hold period
    const commissionsToConfirm = await this.commissionRepo.find({
      where: {
        status: CommissionStatus.PENDING,
        holdUntil: LessThan(new Date())
      },
      relations: ['partner', 'conversion']
    });

    const results = {
      total: commissionsToConfirm.length,
      confirmed: 0,
      failed: 0,
      errors: [] as Array<{ commissionId: string; error: string }>
    };

    for (const commission of commissionsToConfirm) {
      try {
        const oldStatus = commission.status;

        // Confirm commission
        commission.confirm();
        await this.commissionRepo.save(commission);

        // Create audit log
        await this.createAuditLog({
          entityType: 'commission',
          entityId: commission.id,
          action: 'auto_confirmed',
          changes: [{
            field: 'status',
            oldValue: oldStatus,
            newValue: CommissionStatus.CONFIRMED
          }],
          reason: 'Auto-confirmed after hold period'
        });

        // Emit event for webhook notification
        this.eventEmitter.emit('commission.auto_confirmed', {
          commissionId: commission.id,
          partnerId: commission.partnerId,
          amount: commission.commissionAmount,
          confirmedAt: new Date().toISOString()
        });

        results.confirmed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          commissionId: commission.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Helper method to create audit log entries
   *
   * @param data - Audit log data
   */
  private async createAuditLog(data: {
    entityType: string;
    entityId: string;
    action: string;
    userId?: string;
    changes?: AuditChange[];
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const auditLog = this.auditLogRepo.create(data);
    return this.auditLogRepo.save(auditLog);
  }
}
