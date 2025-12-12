/**
 * Sample Usage Service
 *
 * 샘플 사용 로그 관리
 */

import { Repository, DataSource, Between } from 'typeorm';
import {
  SampleUsageLog,
  CustomerReaction,
} from '../entities/sample-usage-log.entity';

export interface AddUsageLogDto {
  storeId: string;
  productId: string;
  productName: string;
  inventoryId?: string;
  quantityUsed?: number;
  staffId?: string;
  staffName?: string;
  customerReaction?: CustomerReaction;
  resultedInPurchase?: boolean;
  purchaseAmount?: number;
  customerAgeGroup?: string;
  customerGender?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageFilter {
  storeId?: string;
  productId?: string;
  fromDate?: Date;
  toDate?: Date;
  customerReaction?: CustomerReaction;
  resultedInPurchase?: boolean;
}

export interface UsageAggregate {
  totalUsage: number;
  totalPurchases: number;
  totalRevenue: number;
  positiveReactions: number;
  negativeReactions: number;
  neutralReactions: number;
  conversionRate: number;
}

export class SampleUsageService {
  private repository: Repository<SampleUsageLog>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SampleUsageLog);
  }

  /**
   * Add usage log
   */
  async addUsageLog(dto: AddUsageLogDto): Promise<SampleUsageLog> {
    const log = this.repository.create({
      ...dto,
      quantityUsed: dto.quantityUsed || 1,
      usedAt: new Date(),
      resultedInPurchase: dto.resultedInPurchase || false,
    });

    return this.repository.save(log);
  }

  /**
   * Get usage log by ID
   */
  async findById(id: string): Promise<SampleUsageLog | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List usage logs with filter
   */
  async listUsageLogs(filter: UsageFilter): Promise<SampleUsageLog[]> {
    const qb = this.repository.createQueryBuilder('log');

    if (filter.storeId) {
      qb.andWhere('log.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.productId) {
      qb.andWhere('log.productId = :productId', { productId: filter.productId });
    }

    if (filter.fromDate) {
      qb.andWhere('log.usedAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      qb.andWhere('log.usedAt <= :toDate', { toDate: filter.toDate });
    }

    if (filter.customerReaction) {
      qb.andWhere('log.customerReaction = :reaction', { reaction: filter.customerReaction });
    }

    if (filter.resultedInPurchase !== undefined) {
      qb.andWhere('log.resultedInPurchase = :purchased', { purchased: filter.resultedInPurchase });
    }

    qb.orderBy('log.usedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Get recent usage logs for store
   */
  async getRecentUsage(storeId: string, limit: number = 20): Promise<SampleUsageLog[]> {
    return this.repository.find({
      where: { storeId },
      order: { usedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Aggregate usage for store
   */
  async aggregateUsage(storeId: string, fromDate?: Date, toDate?: Date): Promise<UsageAggregate> {
    const qb = this.repository.createQueryBuilder('log');

    qb.where('log.storeId = :storeId', { storeId });

    if (fromDate) {
      qb.andWhere('log.usedAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('log.usedAt <= :toDate', { toDate });
    }

    qb.select([
      'SUM(log.quantityUsed) as totalUsage',
      'SUM(CASE WHEN log.resultedInPurchase = true THEN 1 ELSE 0 END) as totalPurchases',
      'SUM(COALESCE(log.purchaseAmount, 0)) as totalRevenue',
      "SUM(CASE WHEN log.customerReaction = 'positive' THEN 1 ELSE 0 END) as positiveReactions",
      "SUM(CASE WHEN log.customerReaction = 'negative' THEN 1 ELSE 0 END) as negativeReactions",
      "SUM(CASE WHEN log.customerReaction = 'neutral' THEN 1 ELSE 0 END) as neutralReactions",
    ]);

    const result = await qb.getRawOne();

    const totalUsage = Number(result?.totalUsage) || 0;
    const totalPurchases = Number(result?.totalPurchases) || 0;

    return {
      totalUsage,
      totalPurchases,
      totalRevenue: Number(result?.totalRevenue) || 0,
      positiveReactions: Number(result?.positiveReactions) || 0,
      negativeReactions: Number(result?.negativeReactions) || 0,
      neutralReactions: Number(result?.neutralReactions) || 0,
      conversionRate: totalUsage > 0 ? (totalPurchases / totalUsage) * 100 : 0,
    };
  }

  /**
   * Aggregate usage by product
   */
  async aggregateByProduct(
    storeId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Array<{
    productId: string;
    productName: string;
    totalUsage: number;
    totalPurchases: number;
    conversionRate: number;
  }>> {
    const qb = this.repository.createQueryBuilder('log');

    qb.where('log.storeId = :storeId', { storeId });

    if (fromDate) {
      qb.andWhere('log.usedAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('log.usedAt <= :toDate', { toDate });
    }

    qb.select([
      'log.productId as productId',
      'log.productName as productName',
      'SUM(log.quantityUsed) as totalUsage',
      'SUM(CASE WHEN log.resultedInPurchase = true THEN 1 ELSE 0 END) as totalPurchases',
    ]);

    qb.groupBy('log.productId');
    qb.addGroupBy('log.productName');
    qb.orderBy('SUM(log.quantityUsed)', 'DESC');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalUsage: Number(r.totalUsage) || 0,
      totalPurchases: Number(r.totalPurchases) || 0,
      conversionRate:
        Number(r.totalUsage) > 0
          ? (Number(r.totalPurchases) / Number(r.totalUsage)) * 100
          : 0,
    }));
  }

  /**
   * Update purchase result for a usage log
   */
  async recordPurchase(
    id: string,
    purchaseAmount: number
  ): Promise<SampleUsageLog | null> {
    const log = await this.findById(id);
    if (!log) return null;

    log.resultedInPurchase = true;
    log.purchaseAmount = purchaseAmount;
    log.customerReaction = 'purchased';

    return this.repository.save(log);
  }

  /**
   * Get daily usage summary
   */
  async getDailyUsage(
    storeId: string,
    days: number = 7
  ): Promise<Array<{ date: string; usage: number; purchases: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const qb = this.repository.createQueryBuilder('log');

    qb.where('log.storeId = :storeId', { storeId });
    qb.andWhere('log.usedAt >= :startDate', { startDate });
    qb.andWhere('log.usedAt <= :endDate', { endDate });

    qb.select([
      "DATE(log.usedAt) as date",
      'SUM(log.quantityUsed) as usage',
      'SUM(CASE WHEN log.resultedInPurchase = true THEN 1 ELSE 0 END) as purchases',
    ]);

    qb.groupBy('DATE(log.usedAt)');
    qb.orderBy('DATE(log.usedAt)', 'ASC');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      date: r.date,
      usage: Number(r.usage) || 0,
      purchases: Number(r.purchases) || 0,
    }));
  }

  /**
   * Delete usage log
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
