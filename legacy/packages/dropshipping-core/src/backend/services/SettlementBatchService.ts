/**
 * SettlementBatchService
 * R-8-8-5: Batch settlement processing service
 *
 * Purpose:
 * - Orchestrates daily batch settlement processing
 * - Called by CLI scripts or scheduled jobs (cron, cloud scheduler)
 * - Processes all parties for a given date
 *
 * Features:
 * - Runs daily settlement batch for all parties
 * - Idempotent: can be run multiple times safely
 * - Provides batch processing statistics
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { SettlementItem } from '../entities/SettlementItem.js';
import { SettlementEngine } from './settlement-engine/SettlementEngine.js';
import logger from '../utils/logger.js';

export interface BatchSettlementResult {
  targetDate: Date;
  totalSettlementsProcessed: number;
  partiesProcessed: number;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

export class SettlementBatchService {
  private settlementItemRepository: Repository<SettlementItem>;
  private settlementEngine: SettlementEngine;

  constructor() {
    this.settlementItemRepository = AppDataSource.getRepository(SettlementItem);
    this.settlementEngine = new SettlementEngine();
  }

  /**
   * Run daily settlement batch for all parties
   * Processes settlements for the target date
   *
   * @param targetDate - Date to process settlements for
   * @returns Batch processing result with statistics
   */
  async runDailyForAllParties(targetDate: Date): Promise<BatchSettlementResult> {
    const startTime = new Date();
    logger.info(`[SettlementBatchService] Starting daily batch for ${targetDate.toISOString()}`);

    try {
      // Calculate period boundaries
      const { periodStart, periodEnd } = this.calculateDayPeriod(targetDate);

      // Find all distinct parties that have settlement items in this period
      const parties = await this.getDistinctParties(periodStart, periodEnd);

      if (parties.length === 0) {
        logger.info(`[SettlementBatchService] No parties found with settlement items for ${targetDate.toISOString()}`);
        const endTime = new Date();
        return {
          targetDate,
          totalSettlementsProcessed: 0,
          partiesProcessed: 0,
          startTime,
          endTime,
          durationMs: endTime.getTime() - startTime.getTime(),
        };
      }

      logger.info(`[SettlementBatchService] Found ${parties.length} parties to process`);

      // Run settlement batch (processes all parties for the date)
      const settlementsProcessed = await this.settlementEngine.runDailySettlement(targetDate);

      const endTime = new Date();
      const result: BatchSettlementResult = {
        targetDate,
        totalSettlementsProcessed: settlementsProcessed,
        partiesProcessed: parties.length,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };

      logger.info(
        `[SettlementBatchService] Daily batch completed for ${targetDate.toISOString()}:`,
        {
          settlementsProcessed: result.totalSettlementsProcessed,
          partiesProcessed: result.partiesProcessed,
          durationMs: result.durationMs,
        }
      );

      return result;
    } catch (error) {
      logger.error(`[SettlementBatchService] Failed to run daily batch for ${targetDate.toISOString()}:`, error);
      throw error;
    }
  }

  /**
   * Run daily settlement batch for yesterday
   * Convenience method for common use case
   */
  async runDailyForYesterday(): Promise<BatchSettlementResult> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Set to start of day

    return await this.runDailyForAllParties(yesterday);
  }

  /**
   * Calculate period boundaries for a given date (daily granularity)
   * Returns start of day (00:00:00) and end of day (23:59:59.999)
   */
  private calculateDayPeriod(date: Date): { periodStart: Date; periodEnd: Date } {
    const targetDate = new Date(date);

    // Start of day (00:00:00)
    const periodStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );

    // End of day (23:59:59.999)
    const periodEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    return { periodStart, periodEnd };
  }

  /**
   * Get distinct parties (partyType + partyId) that have settlement items
   * in the specified period
   */
  private async getDistinctParties(
    periodStart: Date,
    periodEnd: Date
  ): Promise<Array<{ partyType: string; partyId: string }>> {
    const query = this.settlementItemRepository
      .createQueryBuilder('si')
      .select('DISTINCT si.partyType', 'partyType')
      .addSelect('si.partyId', 'partyId')
      .innerJoin('si.settlement', 's')
      .where('s.periodStart = :periodStart', { periodStart })
      .andWhere('s.periodEnd = :periodEnd', { periodEnd })
      .andWhere('si.partyType IS NOT NULL')
      .andWhere('si.partyId IS NOT NULL');

    const results = await query.getRawMany();
    return results;
  }
}
