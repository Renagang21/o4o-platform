/**
 * Sample Conversion Service
 *
 * 샘플→구매 전환율 분석
 */

import { Repository, DataSource, Between } from 'typeorm';
import { SampleConversion, PeriodType } from '../entities/sample-conversion.entity';

export interface UpdateConversionStatsDto {
  storeId: string;
  productId: string;
  productName: string;
  storeName?: string;
  supplierId?: string;
  periodType?: PeriodType;
  sampleUsed: number;
  purchases: number;
  totalRevenue?: number;
  positiveReactions?: number;
  negativeReactions?: number;
  neutralReactions?: number;
  demographicBreakdown?: {
    byAgeGroup?: Record<string, { samples: number; purchases: number }>;
    byGender?: Record<string, { samples: number; purchases: number }>;
  };
}

export interface ConversionFilter {
  storeId?: string;
  productId?: string;
  supplierId?: string;
  periodType?: PeriodType;
  fromDate?: Date;
  toDate?: Date;
}

export interface StoreRanking {
  storeId: string;
  storeName?: string;
  totalSamples: number;
  totalPurchases: number;
  conversionRate: number;
  totalRevenue: number;
}

export class SampleConversionService {
  private repository: Repository<SampleConversion>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SampleConversion);
  }

  /**
   * Calculate and store conversion rate
   */
  async calculateConversionRate(
    storeId: string,
    productId: string,
    periodType: PeriodType = 'daily'
  ): Promise<SampleConversion | null> {
    const { periodStart, periodEnd } = this.getPeriodDates(periodType);

    // Find existing record for this period
    let conversion = await this.repository.findOne({
      where: {
        storeId,
        productId,
        periodType,
        periodStart,
      },
    });

    if (conversion) {
      // Update conversion rate
      conversion.conversionRate =
        conversion.sampleUsed > 0
          ? (conversion.purchases / conversion.sampleUsed) * 100
          : 0;

      conversion.averageOrderValue =
        conversion.purchases > 0
          ? Number(conversion.totalRevenue) / conversion.purchases
          : 0;

      return this.repository.save(conversion);
    }

    return null;
  }

  /**
   * Update conversion stats
   */
  async updateConversionStats(dto: UpdateConversionStatsDto): Promise<SampleConversion> {
    const periodType = dto.periodType || 'daily';
    const { periodStart, periodEnd } = this.getPeriodDates(periodType);

    // Find or create record
    let conversion = await this.repository.findOne({
      where: {
        storeId: dto.storeId,
        productId: dto.productId,
        periodType,
        periodStart,
      },
    });

    if (conversion) {
      // Update existing
      conversion.sampleUsed += dto.sampleUsed;
      conversion.purchases += dto.purchases;
      conversion.totalRevenue = Number(conversion.totalRevenue) + (dto.totalRevenue || 0);

      if (dto.positiveReactions) conversion.positiveReactions += dto.positiveReactions;
      if (dto.negativeReactions) conversion.negativeReactions += dto.negativeReactions;
      if (dto.neutralReactions) conversion.neutralReactions += dto.neutralReactions;

      // Store previous rate before recalculating
      conversion.previousConversionRate = conversion.conversionRate;

      // Recalculate
      conversion.conversionRate =
        conversion.sampleUsed > 0
          ? (conversion.purchases / conversion.sampleUsed) * 100
          : 0;

      conversion.averageOrderValue =
        conversion.purchases > 0
          ? Number(conversion.totalRevenue) / conversion.purchases
          : 0;

      // Calculate change
      if (conversion.previousConversionRate) {
        conversion.conversionRateChange =
          conversion.conversionRate - conversion.previousConversionRate;
      }

      if (dto.demographicBreakdown) {
        conversion.demographicBreakdown = dto.demographicBreakdown;
      }
    } else {
      // Create new
      const conversionRate =
        dto.sampleUsed > 0 ? (dto.purchases / dto.sampleUsed) * 100 : 0;

      conversion = this.repository.create({
        storeId: dto.storeId,
        productId: dto.productId,
        productName: dto.productName,
        storeName: dto.storeName,
        supplierId: dto.supplierId,
        periodType,
        periodStart,
        periodEnd,
        sampleUsed: dto.sampleUsed,
        purchases: dto.purchases,
        conversionRate,
        totalRevenue: dto.totalRevenue || 0,
        averageOrderValue:
          dto.purchases > 0 ? (dto.totalRevenue || 0) / dto.purchases : 0,
        positiveReactions: dto.positiveReactions || 0,
        negativeReactions: dto.negativeReactions || 0,
        neutralReactions: dto.neutralReactions || 0,
        demographicBreakdown: dto.demographicBreakdown,
      });
    }

    return this.repository.save(conversion);
  }

  /**
   * Get conversion by ID
   */
  async findById(id: string): Promise<SampleConversion | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List conversions with filter
   */
  async findAll(filter: ConversionFilter): Promise<SampleConversion[]> {
    const qb = this.repository.createQueryBuilder('conv');

    if (filter.storeId) {
      qb.andWhere('conv.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.productId) {
      qb.andWhere('conv.productId = :productId', { productId: filter.productId });
    }

    if (filter.supplierId) {
      qb.andWhere('conv.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    if (filter.periodType) {
      qb.andWhere('conv.periodType = :periodType', { periodType: filter.periodType });
    }

    if (filter.fromDate) {
      qb.andWhere('conv.periodStart >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      qb.andWhere('conv.periodEnd <= :toDate', { toDate: filter.toDate });
    }

    qb.orderBy('conv.periodStart', 'DESC');

    return qb.getMany();
  }

  /**
   * Rank stores by conversion rate
   */
  async rankStoresByConversion(
    supplierId?: string,
    limit: number = 10,
    fromDate?: Date,
    toDate?: Date
  ): Promise<StoreRanking[]> {
    const qb = this.repository.createQueryBuilder('conv');

    qb.select([
      'conv.storeId as storeId',
      'conv.storeName as storeName',
      'SUM(conv.sampleUsed) as totalSamples',
      'SUM(conv.purchases) as totalPurchases',
      'SUM(conv.totalRevenue) as totalRevenue',
    ]);

    if (supplierId) {
      qb.where('conv.supplierId = :supplierId', { supplierId });
    }

    if (fromDate) {
      qb.andWhere('conv.periodStart >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('conv.periodEnd <= :toDate', { toDate });
    }

    qb.groupBy('conv.storeId');
    qb.addGroupBy('conv.storeName');
    qb.orderBy('SUM(conv.purchases) / NULLIF(SUM(conv.sampleUsed), 0)', 'DESC');
    qb.limit(limit);

    const results = await qb.getRawMany();

    return results.map((r) => ({
      storeId: r.storeId,
      storeName: r.storeName,
      totalSamples: Number(r.totalSamples) || 0,
      totalPurchases: Number(r.totalPurchases) || 0,
      totalRevenue: Number(r.totalRevenue) || 0,
      conversionRate:
        Number(r.totalSamples) > 0
          ? (Number(r.totalPurchases) / Number(r.totalSamples)) * 100
          : 0,
    }));
  }

  /**
   * Get conversion trend for store
   */
  async getConversionTrend(
    storeId: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    conversionRate: number;
    sampleUsed: number;
    purchases: number;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversions = await this.repository.find({
      where: {
        storeId,
        periodType: 'daily',
        periodStart: Between(startDate, endDate) as any,
      },
      order: { periodStart: 'ASC' },
    });

    return conversions.map((c) => ({
      date: c.periodStart.toISOString().split('T')[0],
      conversionRate: Number(c.conversionRate),
      sampleUsed: c.sampleUsed,
      purchases: c.purchases,
    }));
  }

  /**
   * Get top products by conversion
   */
  async getTopProductsByConversion(
    storeId: string,
    limit: number = 10
  ): Promise<Array<{
    productId: string;
    productName: string;
    conversionRate: number;
    totalSamples: number;
    totalPurchases: number;
  }>> {
    const qb = this.repository.createQueryBuilder('conv');

    qb.where('conv.storeId = :storeId', { storeId });

    qb.select([
      'conv.productId as productId',
      'conv.productName as productName',
      'SUM(conv.sampleUsed) as totalSamples',
      'SUM(conv.purchases) as totalPurchases',
    ]);

    qb.groupBy('conv.productId');
    qb.addGroupBy('conv.productName');
    qb.orderBy('SUM(conv.purchases) / NULLIF(SUM(conv.sampleUsed), 0)', 'DESC');
    qb.limit(limit);

    const results = await qb.getRawMany();

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalSamples: Number(r.totalSamples) || 0,
      totalPurchases: Number(r.totalPurchases) || 0,
      conversionRate:
        Number(r.totalSamples) > 0
          ? (Number(r.totalPurchases) / Number(r.totalSamples)) * 100
          : 0,
    }));
  }

  /**
   * Get overall conversion stats
   */
  async getOverallStats(storeId?: string): Promise<{
    totalSamples: number;
    totalPurchases: number;
    overallConversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const qb = this.repository.createQueryBuilder('conv');

    if (storeId) {
      qb.where('conv.storeId = :storeId', { storeId });
    }

    qb.select([
      'SUM(conv.sampleUsed) as totalSamples',
      'SUM(conv.purchases) as totalPurchases',
      'SUM(conv.totalRevenue) as totalRevenue',
    ]);

    const result = await qb.getRawOne();

    const totalSamples = Number(result?.totalSamples) || 0;
    const totalPurchases = Number(result?.totalPurchases) || 0;
    const totalRevenue = Number(result?.totalRevenue) || 0;

    return {
      totalSamples,
      totalPurchases,
      overallConversionRate: totalSamples > 0 ? (totalPurchases / totalSamples) * 100 : 0,
      totalRevenue,
      averageOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
    };
  }

  /**
   * Delete conversion record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private getPeriodDates(periodType: PeriodType): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (periodType) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return { periodStart, periodEnd };
  }
}
