/**
 * DisplayService
 *
 * 매장 진열 관리 서비스
 */

import type { Repository } from 'typeorm';
import { SellerDisplay, DisplayLocation, FacingQuality } from '../entities/seller-display.entity.js';

export interface CreateDisplayDto {
  sellerId: string;
  productId: string;
  location: DisplayLocation;
  faceCount: number;
  facingQuality?: FacingQuality;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDisplayDto {
  location?: DisplayLocation;
  faceCount?: number;
  facingQuality?: FacingQuality;
  notes?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DisplayFilter {
  sellerId?: string;
  productId?: string;
  location?: DisplayLocation;
  isActive?: boolean;
}

export class DisplayService {
  constructor(private readonly displayRepository: Repository<SellerDisplay>) {}

  async create(dto: CreateDisplayDto): Promise<SellerDisplay> {
    // Check if display already exists for this seller-product combo
    const existing = await this.displayRepository.findOne({
      where: {
        sellerId: dto.sellerId,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new Error('Display already exists for this product');
    }

    const display = this.displayRepository.create({
      ...dto,
      isActive: true,
    });

    return this.displayRepository.save(display);
  }

  async update(id: string, dto: UpdateDisplayDto): Promise<SellerDisplay> {
    const display = await this.displayRepository.findOne({ where: { id } });

    if (!display) {
      throw new Error('Display not found');
    }

    Object.assign(display, dto);
    return this.displayRepository.save(display);
  }

  async findById(id: string): Promise<SellerDisplay | null> {
    return this.displayRepository.findOne({ where: { id } });
  }

  async findBySellerId(sellerId: string): Promise<SellerDisplay[]> {
    return this.displayRepository.find({
      where: { sellerId, isActive: true },
      order: { location: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByFilter(filter: DisplayFilter): Promise<SellerDisplay[]> {
    const query = this.displayRepository.createQueryBuilder('display');

    if (filter.sellerId) {
      query.andWhere('display.sellerId = :sellerId', { sellerId: filter.sellerId });
    }
    if (filter.productId) {
      query.andWhere('display.productId = :productId', { productId: filter.productId });
    }
    if (filter.location) {
      query.andWhere('display.location = :location', { location: filter.location });
    }
    if (filter.isActive !== undefined) {
      query.andWhere('display.isActive = :isActive', { isActive: filter.isActive });
    }

    return query.orderBy('display.location', 'ASC').getMany();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.displayRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async softDelete(id: string): Promise<SellerDisplay | null> {
    const display = await this.findById(id);
    if (!display) return null;

    display.isActive = false;
    return this.displayRepository.save(display);
  }

  async getDisplayStats(sellerId: string): Promise<{
    totalDisplays: number;
    byLocation: Record<DisplayLocation, number>;
    totalFaceCount: number;
    averageQuality: string | null;
  }> {
    const displays = await this.findBySellerId(sellerId);

    const byLocation: Record<DisplayLocation, number> = {
      entrance: 0,
      counter: 0,
      shelf_a: 0,
      shelf_b: 0,
      window: 0,
      promotion: 0,
    };

    let totalFaceCount = 0;
    const qualityScores: number[] = [];
    const qualityMap: Record<FacingQuality, number> = {
      excellent: 4,
      good: 3,
      average: 2,
      poor: 1,
    };

    for (const display of displays) {
      byLocation[display.location]++;
      totalFaceCount += display.faceCount;
      if (display.facingQuality) {
        qualityScores.push(qualityMap[display.facingQuality]);
      }
    }

    let averageQuality: string | null = null;
    if (qualityScores.length > 0) {
      const avg = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      if (avg >= 3.5) averageQuality = 'excellent';
      else if (avg >= 2.5) averageQuality = 'good';
      else if (avg >= 1.5) averageQuality = 'average';
      else averageQuality = 'poor';
    }

    return {
      totalDisplays: displays.length,
      byLocation,
      totalFaceCount,
      averageQuality,
    };
  }
}
