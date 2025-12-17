/**
 * SampleService
 *
 * 매장 샘플 관리 서비스
 */

import type { Repository } from 'typeorm';
import { SellerSample, SampleUsageType, SampleUsageLog } from '../entities/seller-sample.entity.js';

export interface CreateSampleDto {
  sellerId: string;
  productId: string;
  sampleCount: number;
  minStockLevel?: number;
  metadata?: Record<string, unknown>;
}

export interface RefillSampleDto {
  quantity: number;
  notes?: string;
}

export interface UseSampleDto {
  quantity: number;
  purpose: SampleUsageType;
  notes?: string;
}

export class SampleService {
  constructor(private readonly sampleRepository: Repository<SellerSample>) {}

  async create(dto: CreateSampleDto): Promise<SellerSample> {
    const existing = await this.sampleRepository.findOne({
      where: {
        sellerId: dto.sellerId,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new Error('Sample record already exists for this product');
    }

    const sample = this.sampleRepository.create({
      ...dto,
      usageLogs: [],
      isActive: true,
    });

    return this.sampleRepository.save(sample);
  }

  async findById(id: string): Promise<SellerSample | null> {
    return this.sampleRepository.findOne({ where: { id } });
  }

  async findBySellerId(sellerId: string): Promise<SellerSample[]> {
    return this.sampleRepository.find({
      where: { sellerId, isActive: true },
      order: { sampleCount: 'ASC' },
    });
  }

  async findBySellerAndProduct(sellerId: string, productId: string): Promise<SellerSample | null> {
    return this.sampleRepository.findOne({
      where: { sellerId, productId, isActive: true },
    });
  }

  async refillSample(id: string, dto: RefillSampleDto): Promise<SellerSample> {
    const sample = await this.findById(id);
    if (!sample) {
      throw new Error('Sample not found');
    }

    sample.sampleCount += dto.quantity;
    sample.lastRefilledAt = new Date();
    sample.lastRefillQuantity = dto.quantity;

    // Add to usage log
    const log: SampleUsageLog = {
      date: new Date().toISOString(),
      quantity: dto.quantity,
      purpose: 'tester', // Refill is treated as tester stock
      notes: dto.notes ? `Refill: ${dto.notes}` : 'Refill',
    };
    sample.usageLogs = [...(sample.usageLogs || []), log];

    return this.sampleRepository.save(sample);
  }

  async useSample(id: string, dto: UseSampleDto): Promise<SellerSample> {
    const sample = await this.findById(id);
    if (!sample) {
      throw new Error('Sample not found');
    }

    if (sample.sampleCount < dto.quantity) {
      throw new Error('Insufficient sample count');
    }

    sample.sampleCount -= dto.quantity;

    const log: SampleUsageLog = {
      date: new Date().toISOString(),
      quantity: -dto.quantity,
      purpose: dto.purpose,
      notes: dto.notes,
    };
    sample.usageLogs = [...(sample.usageLogs || []), log];

    return this.sampleRepository.save(sample);
  }

  async getLowStockSamples(sellerId: string): Promise<SellerSample[]> {
    return this.sampleRepository
      .createQueryBuilder('sample')
      .where('sample.sellerId = :sellerId', { sellerId })
      .andWhere('sample.isActive = true')
      .andWhere('sample.sampleCount <= sample.minStockLevel')
      .orderBy('sample.sampleCount', 'ASC')
      .getMany();
  }

  async getSampleStats(sellerId: string): Promise<{
    totalSamples: number;
    totalProducts: number;
    lowStockCount: number;
    recentUsage: number;
  }> {
    const samples = await this.findBySellerId(sellerId);

    let totalSamples = 0;
    let lowStockCount = 0;
    let recentUsage = 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const sample of samples) {
      totalSamples += sample.sampleCount;

      if (sample.sampleCount <= sample.minStockLevel) {
        lowStockCount++;
      }

      // Calculate recent usage
      for (const log of sample.usageLogs || []) {
        const logDate = new Date(log.date);
        if (logDate >= oneWeekAgo && log.quantity < 0) {
          recentUsage += Math.abs(log.quantity);
        }
      }
    }

    return {
      totalSamples,
      totalProducts: samples.length,
      lowStockCount,
      recentUsage,
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sampleRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
