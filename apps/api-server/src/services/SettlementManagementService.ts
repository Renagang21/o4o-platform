/**
 * Phase PD-5: Settlement Management Service
 *
 * Handles settlement calculation and management for sellers, suppliers, and platform
 * This is separate from SettlementService which handles commission calculation
 *
 * P2-C Phase C-1: Added v2 entry point for SettlementEngine v2
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import {
  Settlement,
  SettlementPartyType,
  SettlementStatus,
} from '../entities/Settlement.js';
import { Order } from '../entities/Order.js';
import { SettlementItem } from '../entities/SettlementItem.js';
import { Commission } from '../entities/Commission.js';
import { notificationService } from './NotificationService.js';
import logger from '../utils/logger.js';
import { invalidateSettlementCache } from '../utils/cache-invalidation.js';
import { SettlementEngineV2 } from './settlement/SettlementEngineV2.js';
import type { SettlementV2Config, SettlementEngineV2Result } from './settlement/SettlementTypesV2.js';

export interface SettlementFilters {
  page?: number;
  limit?: number;
  status?: SettlementStatus;
  partyType?: SettlementPartyType;
  periodStart?: Date;
  periodEnd?: Date;
  search?: string; // Search by party name or ID
}

export class SettlementManagementService {
  private settlementRepo: Repository<Settlement>;
  private settlementEngineV2: SettlementEngineV2;

  constructor() {
    this.settlementRepo = AppDataSource.getRepository(Settlement);

    // P2-C Phase C-2: Initialize SettlementEngine v2 with repository dependencies
    const orderRepo = AppDataSource.getRepository(Order);
    const settlementRepo = AppDataSource.getRepository(Settlement);
    const settlementItemRepo = AppDataSource.getRepository(SettlementItem);
    const commissionRepo = AppDataSource.getRepository(Commission);

    this.settlementEngineV2 = new SettlementEngineV2(
      orderRepo,
      settlementRepo,
      settlementItemRepo,
      commissionRepo
    );
  }

  /**
   * Get settlements for a party with filters
   */
  async getSettlements(
    partyType: SettlementPartyType,
    partyId: string,
    filters: SettlementFilters = {}
  ): Promise<{ settlements: Settlement[]; total: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.settlementRepo
      .createQueryBuilder('settlement')
      .where('settlement.partyType = :partyType', { partyType })
      .andWhere('settlement.partyId = :partyId', { partyId });

    if (filters.status) {
      queryBuilder.andWhere('settlement.status = :status', {
        status: filters.status,
      });
    }

    if (filters.periodStart) {
      queryBuilder.andWhere('settlement.periodStart >= :periodStart', {
        periodStart: filters.periodStart,
      });
    }

    if (filters.periodEnd) {
      queryBuilder.andWhere('settlement.periodEnd <= :periodEnd', {
        periodEnd: filters.periodEnd,
      });
    }

    queryBuilder.orderBy('settlement.createdAt', 'DESC').skip(skip).take(limit);

    const [settlements, total] = await queryBuilder.getManyAndCount();

    return {
      settlements,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all settlements (admin only) with filters
   */
  async getAllSettlements(
    filters: SettlementFilters = {}
  ): Promise<{ settlements: Settlement[]; total: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.settlementRepo
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.party', 'party');

    if (filters.partyType) {
      queryBuilder.andWhere('settlement.partyType = :partyType', {
        partyType: filters.partyType,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('settlement.status = :status', {
        status: filters.status,
      });
    }

    if (filters.periodStart) {
      queryBuilder.andWhere('settlement.periodStart >= :periodStart', {
        periodStart: filters.periodStart,
      });
    }

    if (filters.periodEnd) {
      queryBuilder.andWhere('settlement.periodEnd <= :periodEnd', {
        periodEnd: filters.periodEnd,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(settlement.partyId ILIKE :search OR party.username ILIKE :search OR party.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('settlement.createdAt', 'DESC').skip(skip).take(limit);

    const [settlements, total] = await queryBuilder.getManyAndCount();

    return {
      settlements,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get settlement by ID with items
   */
  async getSettlementById(settlementId: string): Promise<Settlement | null> {
    return this.settlementRepo.findOne({
      where: { id: settlementId },
      relations: ['items', 'party'],
    });
  }

  /**
   * Mark settlement as paid
   */
  async markAsPaid(settlementId: string, paidAt?: Date): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    // Prevent duplicate "paid" notifications
    const wasPending = settlement.status === SettlementStatus.PENDING;

    settlement.markAsPaid(paidAt);
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement marked as paid', {
      settlementId,
      paidAt: saved.paidAt,
    });

    // CI-2.2: Send notification when settlement is marked as paid
    if (wasPending && saved.partyId) {
      const periodLabel = `${saved.periodStart.toLocaleDateString('ko-KR')} ~ ${saved.periodEnd.toLocaleDateString('ko-KR')}`;
      await notificationService.createNotification({
        userId: saved.partyId,
        type: 'settlement.paid',
        title: '정산이 지급되었습니다',
        message: `${periodLabel} 정산 ${saved.payableAmount.toLocaleString()}원이 지급 처리되었습니다.`,
        metadata: {
          settlementId: saved.id,
          partyType: saved.partyType,
          payableAmount: saved.payableAmount,
          periodStart: saved.periodStart.toISOString(),
          periodEnd: saved.periodEnd.toISOString(),
        },
        channel: 'in_app',
      }).catch(err => logger.error(`Failed to send settlement.paid notification to ${saved.partyId}:`, err));
    }

    return saved;
  }

  /**
   * Cancel settlement
   */
  async cancelSettlement(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.cancel();
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement cancelled', {
      settlementId,
    });

    return saved;
  }

  /**
   * Update settlement status to processing
   */
  async markAsProcessing(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    if (!settlement.canModify()) {
      throw new Error(`Settlement ${settlementId} cannot be modified`);
    }

    settlement.status = SettlementStatus.PROCESSING;
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement marked as processing', {
      settlementId,
    });

    return saved;
  }

  /**
   * Update settlement status (Admin only)
   * Phase SETTLE-ADMIN
   */
  async updateSettlementStatus(
    settlementId: string,
    status: SettlementStatus,
    notes?: string
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.status = status;
    if (notes !== undefined) {
      settlement.notes = notes;
    }

    const saved = await this.settlementRepo.save(settlement);

    logger.info('[SETTLE-ADMIN] Settlement status updated', {
      settlementId,
      status,
      hasNotes: !!notes,
    });

    return saved;
  }

  /**
   * Update settlement memo (Admin only)
   * Phase SETTLE-ADMIN
   */
  async updateSettlementMemo(
    settlementId: string,
    memo: string
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.memo = memo;
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[SETTLE-ADMIN] Settlement memo updated', {
      settlementId,
      memoLength: memo.length,
    });

    return saved;
  }

  /**
   * P2-C Phase C-1: SettlementEngine v2 entry point
   *
   * Generate settlements using v2 engine with policy-based rules
   * Currently returns skeleton response (Phase C-1)
   * Actual implementation in Phase C-2+
   *
   * Usage:
   * - Shadow mode testing (compare v1 vs v2)
   * - Policy-based settlement calculation
   * - Versioned rule sets
   *
   * @param config - SettlementV2Config with period, parties, rules
   * @returns Promise<SettlementEngineV2Result> with settlements and diagnostics
   */
  async generateSettlementsV2(
    config: SettlementV2Config
  ): Promise<SettlementEngineV2Result> {
    logger.info('[SettlementManagement] generateSettlementsV2 called (Phase C-1 skeleton)', {
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      partiesCount: config.parties.length,
      ruleSetId: config.ruleSet.id,
      dryRun: config.dryRun ?? true,
    });

    // TODO P2-C Phase C-2: Add validation logic
    // TODO P2-C Phase C-2: Add cache invalidation after settlement generation

    // Delegate to SettlementEngineV2
    return this.settlementEngineV2.generateSettlements(config);
  }
}
