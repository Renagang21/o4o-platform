/**
 * Sample Supply Service
 *
 * 샘플 공급 관리
 */

import { Repository, DataSource, Between } from 'typeorm';
import { SampleSupply, SampleStatus, SampleType } from '../entities/sample-supply.entity';

export interface CreateSampleShipmentDto {
  supplierId: string;
  storeId?: string;
  partnerId?: string;
  productId: string;
  productName: string;
  sampleType?: SampleType;
  quantityShipped: number;
  unitCost?: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  expiryDate?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSampleUsageDto {
  quantityUsed: number;
  notes?: string;
}

export interface RecordConversionDto {
  conversionCount: number;
  conversionRevenue: number;
}

export interface SampleFilter {
  supplierId: string;
  storeId?: string;
  partnerId?: string;
  productId?: string;
  status?: SampleStatus;
  sampleType?: SampleType;
  fromDate?: Date;
  toDate?: Date;
}

export interface SampleStats {
  totalShipped: number;
  totalUsed: number;
  totalRemaining: number;
  totalCost: number;
  totalConversions: number;
  totalConversionRevenue: number;
  conversionRate: number;
}

export class SampleSupplyService {
  private repository: Repository<SampleSupply>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SampleSupply);
  }

  /**
   * Record sample shipment
   */
  async recordShipment(dto: CreateSampleShipmentDto): Promise<SampleSupply> {
    const totalCost = dto.unitCost ? dto.unitCost * dto.quantityShipped : 0;

    const sample = this.repository.create({
      ...dto,
      recipientPhone: dto.recipientPhone ? dto.recipientPhone.replace(/\D/g, '') : dto.recipientPhone,
      sampleType: dto.sampleType || 'trial',
      unitCost: dto.unitCost || 0,
      totalCost,
      quantityRemaining: dto.quantityShipped,
      status: 'shipped',
      shippedAt: new Date(),
    });

    return this.repository.save(sample);
  }

  /**
   * Get sample by ID
   */
  async findById(id: string): Promise<SampleSupply | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List samples with filter
   */
  async findAll(filter: SampleFilter): Promise<SampleSupply[]> {
    const qb = this.repository.createQueryBuilder('sample');

    qb.where('sample.supplierId = :supplierId', { supplierId: filter.supplierId });

    if (filter.storeId) {
      qb.andWhere('sample.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.partnerId) {
      qb.andWhere('sample.partnerId = :partnerId', { partnerId: filter.partnerId });
    }

    if (filter.productId) {
      qb.andWhere('sample.productId = :productId', { productId: filter.productId });
    }

    if (filter.status) {
      qb.andWhere('sample.status = :status', { status: filter.status });
    }

    if (filter.sampleType) {
      qb.andWhere('sample.sampleType = :sampleType', { sampleType: filter.sampleType });
    }

    if (filter.fromDate) {
      qb.andWhere('sample.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      qb.andWhere('sample.createdAt <= :toDate', { toDate: filter.toDate });
    }

    qb.orderBy('sample.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Update sample usage
   */
  async updateUsage(id: string, dto: UpdateSampleUsageDto): Promise<SampleSupply | null> {
    const sample = await this.findById(id);
    if (!sample) {
      return null;
    }

    const newUsed = sample.quantityUsed + dto.quantityUsed;
    if (newUsed > sample.quantityShipped) {
      throw new Error('Used quantity cannot exceed shipped quantity');
    }

    sample.quantityUsed = newUsed;
    sample.quantityRemaining = sample.quantityShipped - newUsed;

    if (sample.quantityRemaining === 0) {
      sample.status = 'used';
    }

    if (dto.notes) {
      sample.notes = sample.notes ? `${sample.notes}\n${dto.notes}` : dto.notes;
    }

    return this.repository.save(sample);
  }

  /**
   * Mark as delivered
   */
  async markDelivered(id: string): Promise<SampleSupply | null> {
    const sample = await this.findById(id);
    if (!sample) {
      return null;
    }

    sample.status = 'delivered';
    sample.deliveredAt = new Date();

    return this.repository.save(sample);
  }

  /**
   * Record conversion (sample to sale)
   */
  async recordConversion(id: string, dto: RecordConversionDto): Promise<SampleSupply | null> {
    const sample = await this.findById(id);
    if (!sample) {
      return null;
    }

    sample.conversionCount += dto.conversionCount;
    sample.conversionRevenue += dto.conversionRevenue;

    return this.repository.save(sample);
  }

  /**
   * Get stats by supplier
   */
  async getStatsBySupplierId(supplierId: string): Promise<SampleStats> {
    const samples = await this.repository.find({
      where: { supplierId },
    });

    const totalShipped = samples.reduce((sum, s) => sum + s.quantityShipped, 0);
    const totalUsed = samples.reduce((sum, s) => sum + s.quantityUsed, 0);
    const totalRemaining = samples.reduce((sum, s) => sum + s.quantityRemaining, 0);
    const totalCost = samples.reduce((sum, s) => sum + Number(s.totalCost), 0);
    const totalConversions = samples.reduce((sum, s) => sum + s.conversionCount, 0);
    const totalConversionRevenue = samples.reduce((sum, s) => sum + Number(s.conversionRevenue), 0);

    return {
      totalShipped,
      totalUsed,
      totalRemaining,
      totalCost,
      totalConversions,
      totalConversionRevenue,
      conversionRate: totalUsed > 0 ? (totalConversions / totalUsed) * 100 : 0,
    };
  }

  /**
   * Get stats by store
   */
  async getStatsByStore(supplierId: string, storeId: string): Promise<SampleStats> {
    const samples = await this.repository.find({
      where: { supplierId, storeId },
    });

    const totalShipped = samples.reduce((sum, s) => sum + s.quantityShipped, 0);
    const totalUsed = samples.reduce((sum, s) => sum + s.quantityUsed, 0);
    const totalRemaining = samples.reduce((sum, s) => sum + s.quantityRemaining, 0);
    const totalCost = samples.reduce((sum, s) => sum + Number(s.totalCost), 0);
    const totalConversions = samples.reduce((sum, s) => sum + s.conversionCount, 0);
    const totalConversionRevenue = samples.reduce((sum, s) => sum + Number(s.conversionRevenue), 0);

    return {
      totalShipped,
      totalUsed,
      totalRemaining,
      totalCost,
      totalConversions,
      totalConversionRevenue,
      conversionRate: totalUsed > 0 ? (totalConversions / totalUsed) * 100 : 0,
    };
  }

  /**
   * Get store rankings by conversion
   */
  async getStoreRankings(
    supplierId: string,
    limit: number = 10
  ): Promise<Array<{ storeId: string; conversionRate: number; totalConversions: number }>> {
    const result = await this.repository
      .createQueryBuilder('sample')
      .select('sample.storeId', 'storeId')
      .addSelect('SUM(sample.conversionCount)', 'totalConversions')
      .addSelect('SUM(sample.quantityUsed)', 'totalUsed')
      .where('sample.supplierId = :supplierId', { supplierId })
      .andWhere('sample.storeId IS NOT NULL')
      .groupBy('sample.storeId')
      .orderBy('SUM(sample.conversionCount)', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      storeId: r.storeId,
      totalConversions: Number(r.totalConversions) || 0,
      conversionRate:
        Number(r.totalUsed) > 0
          ? (Number(r.totalConversions) / Number(r.totalUsed)) * 100
          : 0,
    }));
  }

  /**
   * Delete sample record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
