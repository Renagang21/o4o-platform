import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { CommissionPolicy, PolicyType, PolicyStatus, CommissionType } from '../entities/CommissionPolicy.js';
import { Commission, CommissionStatus } from '../entities/Commission.js';
import { ConversionEvent, ConversionStatus } from '../entities/ConversionEvent.js';
import { Partner } from '../entities/Partner.js';
import { Product } from '../entities/Product.js';
import logger from '../utils/logger.js';

export interface CreateCommissionRequest {
  conversionId: string;
  skipValidation?: boolean;
}

export interface PolicyMatchContext {
  partnerId: string;
  partnerTier?: string;
  productId: string;
  supplierId?: string;
  category?: string;
  tags?: string[];
  orderAmount: number;
  isNewCustomer?: boolean;
}

export interface PolicyFilters {
  policyType?: PolicyType;
  status?: PolicyStatus;
  partnerId?: string;
  productId?: string;
  category?: string;
  isActive?: boolean;
  sortBy?: 'priority' | 'createdAt' | 'policyCode';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CommissionFilters {
  partnerId?: string;
  status?: CommissionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'createdAt' | 'commissionAmount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class CommissionEngine {
  private commissionRepository: Repository<Commission>;
  private policyRepository: Repository<CommissionPolicy>;
  private conversionRepository: Repository<ConversionEvent>;
  private partnerRepository: Repository<Partner>;
  private productRepository: Repository<Product>;

  // Hold period in days (default 7 days for refund window)
  private readonly HOLD_PERIOD_DAYS = 7;

  constructor() {
    this.commissionRepository = AppDataSource.getRepository(Commission);
    this.policyRepository = AppDataSource.getRepository(CommissionPolicy);
    this.conversionRepository = AppDataSource.getRepository(ConversionEvent);
    this.partnerRepository = AppDataSource.getRepository(Partner);
    this.productRepository = AppDataSource.getRepository(Product);
  }

  /**
   * Create commission from conversion event
   */
  async createCommission(data: CreateCommissionRequest): Promise<Commission> {
    try {
      // 1. Get conversion event
      const conversion = await this.conversionRepository.findOne({
        where: { id: data.conversionId },
        relations: ['partner', 'product']
      });

      if (!conversion) {
        throw new Error('Conversion not found');
      }

      // 2. Validate conversion status
      if (!data.skipValidation && conversion.status !== ConversionStatus.CONFIRMED) {
        throw new Error(`Conversion must be confirmed to create commission (current status: ${conversion.status})`);
      }

      // 3. Check for duplicate commission
      const existing = await this.commissionRepository.findOne({
        where: { conversionId: data.conversionId }
      });

      if (existing) {
        logger.warn(`Commission already exists for conversion: ${data.conversionId}`);
        return existing;
      }

      // 4. Build policy match context
      const context: PolicyMatchContext = {
        partnerId: conversion.partnerId,
        partnerTier: conversion.partner.tier,
        productId: conversion.productId,
        supplierId: conversion.product.supplierId || undefined,
        category: conversion.product.category?.name || conversion.product.category?.slug || undefined,
        tags: conversion.product.tags || undefined,
        orderAmount: conversion.orderAmount,
        isNewCustomer: conversion.isNewCustomer
      };

      // 5. Find matching policy
      const policy = await this.findBestMatchingPolicy(context);

      if (!policy) {
        throw new Error('No matching commission policy found');
      }

      // 6. Calculate commission amount
      const commissionAmount = policy.calculateCommission(
        conversion.orderAmount,
        conversion.quantity
      );

      if (commissionAmount <= 0) {
        throw new Error('Calculated commission amount is zero or negative');
      }

      // 7. Calculate hold release date
      const holdUntil = new Date(Date.now() + this.HOLD_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      // 8. Create commission record
      const commission = this.commissionRepository.create({
        partnerId: conversion.partnerId,
        productId: conversion.productId,
        sellerId: conversion.product.supplierId || null,
        orderId: conversion.orderId,
        conversionId: conversion.id,
        referralCode: conversion.referralCode,
        status: CommissionStatus.PENDING,
        commissionAmount,
        orderAmount: conversion.orderAmount,
        currency: conversion.currency,
        commissionRate: policy.commissionRate || null,
        policyId: policy.id,
        policyType: policy.policyType,
        holdUntil,
        metadata: {
          policyCode: policy.policyCode,
          policyName: policy.name,
          attributionModel: conversion.attributionModel,
          attributionWeight: conversion.attributionWeight,
          conversionType: conversion.conversionType
        }
      });

      const savedCommission = await this.commissionRepository.save(commission);

      // 9. Increment policy usage counter
      policy.incrementUsage();
      await this.policyRepository.save(policy);

      logger.info(
        `Commission created: ${savedCommission.id} (amount: ${commissionAmount}, policy: ${policy.policyCode})`
      );

      return savedCommission;

    } catch (error) {
      logger.error('Error creating commission:', error);
      throw error;
    }
  }

  /**
   * Find best matching policy based on priority and specificity
   */
  async findBestMatchingPolicy(context: PolicyMatchContext): Promise<CommissionPolicy | null> {
    // Get all active policies
    const allPolicies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
      order: { priority: 'DESC' } // Higher priority first
    });

    // Filter policies that are currently active and apply to the context
    const applicablePolicies = allPolicies.filter(policy => {
      // Check if policy is active (time-based, usage limits, etc.)
      if (!policy.isActive()) {
        return false;
      }

      // Check if policy applies to this context
      return policy.appliesTo(context);
    });

    if (applicablePolicies.length === 0) {
      return null;
    }

    // Policies are already sorted by priority (DESC)
    // If multiple policies have same priority, prefer more specific ones

    // Sort by specificity score (higher = more specific)
    applicablePolicies.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) {
        return priorityDiff; // Higher priority wins
      }

      // Same priority - compare specificity
      const specificityA = this.calculateSpecificity(a);
      const specificityB = this.calculateSpecificity(b);

      return specificityB - specificityA; // Higher specificity wins
    });

    // Check stacking rules
    const selectedPolicy = applicablePolicies[0];

    // If policy cannot stack, return just this one
    if (!selectedPolicy.canStackWithOtherPolicies) {
      return selectedPolicy;
    }

    // TODO: Implement policy stacking logic if needed
    // For now, return the highest priority/most specific policy

    return selectedPolicy;
  }

  /**
   * Calculate specificity score for a policy (higher = more specific)
   */
  private calculateSpecificity(policy: CommissionPolicy): number {
    let score = 0;

    // Partner-specific: +100
    if (policy.partnerId) score += 100;

    // Tier-specific: +80
    if (policy.partnerTier) score += 80;

    // Product-specific: +90
    if (policy.productId) score += 90;

    // Supplier-specific: +70
    if (policy.supplierId) score += 70;

    // Category-specific: +60
    if (policy.category) score += 60;

    // Has tags: +50
    if (policy.tags && policy.tags.length > 0) score += 50;

    // Has order amount constraints: +40
    if (policy.minOrderAmount || policy.maxOrderAmount) score += 40;

    // Requires new customer: +30
    if (policy.requiresNewCustomer) score += 30;

    // Promotional (time-limited): +20
    if (policy.policyType === PolicyType.PROMOTIONAL) score += 20;

    return score;
  }

  /**
   * Confirm commission (move from pending to confirmed)
   */
  async confirmCommission(commissionId: string): Promise<Commission> {
    try {
      const commission = await this.commissionRepository.findOne({
        where: { id: commissionId },
        relations: ['partner']
      });

      if (!commission) {
        throw new Error('Commission not found');
      }

      if (commission.status !== CommissionStatus.PENDING) {
        throw new Error(`Commission is not pending (current status: ${commission.status})`);
      }

      commission.status = CommissionStatus.CONFIRMED;
      commission.confirmedAt = new Date();

      const updated = await this.commissionRepository.save(commission);

      logger.info(`Commission confirmed: ${commissionId} (amount: ${commission.commissionAmount})`);

      return updated;

    } catch (error) {
      logger.error('Error confirming commission:', error);
      throw error;
    }
  }

  /**
   * Cancel commission (e.g., when order is cancelled)
   */
  async cancelCommission(commissionId: string, reason?: string): Promise<Commission> {
    try {
      const commission = await this.commissionRepository.findOne({
        where: { id: commissionId }
      });

      if (!commission) {
        throw new Error('Commission not found');
      }

      if (commission.status === CommissionStatus.PAID) {
        throw new Error('Cannot cancel commission that has already been paid');
      }

      commission.status = CommissionStatus.CANCELLED;
      commission.cancelledAt = new Date();

      if (reason) {
        commission.metadata = { ...commission.metadata, cancellationReason: reason };
      }

      const updated = await this.commissionRepository.save(commission);

      logger.info(`Commission cancelled: ${commissionId} (reason: ${reason || 'N/A'})`);

      return updated;

    } catch (error) {
      logger.error('Error cancelling commission:', error);
      throw error;
    }
  }

  /**
   * Adjust commission amount (e.g., for partial refunds)
   */
  async adjustCommission(
    commissionId: string,
    newAmount: number,
    reason: string
  ): Promise<Commission> {
    try {
      const commission = await this.commissionRepository.findOne({
        where: { id: commissionId },
        relations: ['partner']
      });

      if (!commission) {
        throw new Error('Commission not found');
      }

      if (commission.status === CommissionStatus.PAID) {
        throw new Error('Cannot adjust commission that has already been paid');
      }

      const oldAmount = commission.commissionAmount;
      commission.commissionAmount = newAmount;

      if (!commission.metadata) {
        commission.metadata = {};
      }

      commission.metadata.adjustmentHistory = [
        ...(commission.metadata.adjustmentHistory || []),
        {
          oldAmount,
          newAmount,
          reason,
          adjustedAt: new Date().toISOString()
        }
      ];

      const updated = await this.commissionRepository.save(commission);

      logger.info(
        `Commission adjusted: ${commissionId} (${oldAmount} -> ${newAmount}, reason: ${reason})`
      );

      return updated;

    } catch (error) {
      logger.error('Error adjusting commission:', error);
      throw error;
    }
  }

  /**
   * Mark commission as paid
   */
  async markAsPaid(
    commissionId: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<Commission> {
    try {
      const commission = await this.commissionRepository.findOne({
        where: { id: commissionId }
      });

      if (!commission) {
        throw new Error('Commission not found');
      }

      if (commission.status !== CommissionStatus.CONFIRMED) {
        throw new Error(`Commission must be confirmed before payment (current status: ${commission.status})`);
      }

      commission.status = CommissionStatus.PAID;
      commission.paidAt = new Date();
      commission.paymentMethod = paymentMethod;
      commission.paymentReference = paymentReference;

      const updated = await this.commissionRepository.save(commission);

      logger.info(
        `Commission marked as paid: ${commissionId} (method: ${paymentMethod}, ref: ${paymentReference || 'N/A'})`
      );

      return updated;

    } catch (error) {
      logger.error('Error marking commission as paid:', error);
      throw error;
    }
  }

  /**
   * Auto-confirm commissions that have passed hold period
   */
  async autoConfirmCommissions(): Promise<number> {
    try {
      const now = new Date();

      const pendingCommissions = await this.commissionRepository
        .createQueryBuilder('commission')
        .where('commission.status = :status', { status: CommissionStatus.PENDING })
        .andWhere('commission.holdUntil <= :now', { now })
        .getMany();

      for (const commission of pendingCommissions) {
        await this.confirmCommission(commission.id);
      }

      logger.info(`Auto-confirmed ${pendingCommissions.length} commissions`);

      return pendingCommissions.length;

    } catch (error) {
      logger.error('Error auto-confirming commissions:', error);
      throw error;
    }
  }

  /**
   * Get commissions with filters
   */
  async getCommissions(filters: CommissionFilters = {}) {
    try {
      const {
        partnerId,
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = filters;

      const queryBuilder = this.commissionRepository
        .createQueryBuilder('commission')
        .leftJoinAndSelect('commission.partner', 'partner')
        .leftJoinAndSelect('commission.product', 'product');

      if (partnerId) {
        queryBuilder.andWhere('commission.partnerId = :partnerId', { partnerId });
      }

      if (status) {
        queryBuilder.andWhere('commission.status = :status', { status });
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

  /**
   * Create or update commission policy
   */
  async upsertPolicy(data: Partial<CommissionPolicy>): Promise<CommissionPolicy> {
    try {
      if (data.id) {
        // Update existing
        const existing = await this.policyRepository.findOne({ where: { id: data.id } });
        if (!existing) {
          throw new Error('Policy not found');
        }

        const updated = await this.policyRepository.save({
          ...existing,
          ...data,
          updatedAt: new Date()
        });

        logger.info(`Policy updated: ${updated.policyCode}`);
        return updated;

      } else {
        // Create new
        const policy = this.policyRepository.create(data);
        const saved = await this.policyRepository.save(policy);

        logger.info(`Policy created: ${saved.policyCode}`);
        return saved;
      }

    } catch (error) {
      logger.error('Error upserting policy:', error);
      throw error;
    }
  }

  /**
   * Get policies with filters
   */
  async getPolicies(filters: PolicyFilters = {}) {
    try {
      const {
        policyType,
        status,
        partnerId,
        productId,
        category,
        isActive,
        sortBy = 'priority',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = filters;

      const queryBuilder = this.policyRepository.createQueryBuilder('policy');

      if (policyType) {
        queryBuilder.andWhere('policy.policyType = :policyType', { policyType });
      }

      if (status) {
        queryBuilder.andWhere('policy.status = :status', { status });
      }

      if (partnerId) {
        queryBuilder.andWhere('policy.partnerId = :partnerId', { partnerId });
      }

      if (productId) {
        queryBuilder.andWhere('policy.productId = :productId', { productId });
      }

      if (category) {
        queryBuilder.andWhere('policy.category = :category', { category });
      }

      // Note: isActive filter requires checking time-based validity
      // This is a simplification - full implementation would use a method

      const sortField = `policy.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [policies, total] = await queryBuilder.getManyAndCount();

      return {
        policies,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching policies:', error);
      throw error;
    }
  }

  /**
   * Get commission stats
   */
  async getCommissionStats(partnerId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const queryBuilder = this.commissionRepository
        .createQueryBuilder('commission')
        .select([
          'COUNT(*) as totalCommissions',
          'COUNT(CASE WHEN commission.status = :pending THEN 1 END) as pendingCommissions',
          'COUNT(CASE WHEN commission.status = :confirmed THEN 1 END) as confirmedCommissions',
          'COUNT(CASE WHEN commission.status = :paid THEN 1 END) as paidCommissions',
          'COUNT(CASE WHEN commission.status = :cancelled THEN 1 END) as cancelledCommissions',
          'SUM(commission.commissionAmount) as totalAmount',
          'SUM(CASE WHEN commission.status = :pending THEN commission.commissionAmount ELSE 0 END) as pendingAmount',
          'SUM(CASE WHEN commission.status = :confirmed THEN commission.commissionAmount ELSE 0 END) as confirmedAmount',
          'SUM(CASE WHEN commission.status = :paid THEN commission.commissionAmount ELSE 0 END) as paidAmount',
          'AVG(commission.commissionAmount) as averageCommission'
        ])
        .where('commission.partnerId = :partnerId', { partnerId })
        .setParameters({
          pending: CommissionStatus.PENDING,
          confirmed: CommissionStatus.CONFIRMED,
          paid: CommissionStatus.PAID,
          cancelled: CommissionStatus.CANCELLED
        });

      if (dateFrom) {
        queryBuilder.andWhere('commission.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('commission.createdAt <= :dateTo', { dateTo });
      }

      const stats = await queryBuilder.getRawOne();

      return {
        totalCommissions: parseInt(stats.totalCommissions) || 0,
        pendingCommissions: parseInt(stats.pendingCommissions) || 0,
        confirmedCommissions: parseInt(stats.confirmedCommissions) || 0,
        paidCommissions: parseInt(stats.paidCommissions) || 0,
        cancelledCommissions: parseInt(stats.cancelledCommissions) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
        pendingAmount: parseFloat(stats.pendingAmount) || 0,
        confirmedAmount: parseFloat(stats.confirmedAmount) || 0,
        paidAmount: parseFloat(stats.paidAmount) || 0,
        averageCommission: parseFloat(stats.averageCommission) || 0,
        period: { from: dateFrom, to: dateTo }
      };

    } catch (error) {
      logger.error('Error fetching commission stats:', error);
      throw error;
    }
  }
}

export default CommissionEngine;
