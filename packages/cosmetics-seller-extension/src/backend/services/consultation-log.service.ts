/**
 * ConsultationLogService
 *
 * 판매원 상담 로그 관리 서비스
 */

import type { Repository } from 'typeorm';
import {
  SellerConsultationLog,
  ConsultationResultStatus,
  RecommendedProduct,
  PurchasedProduct,
} from '../entities/seller-consultation-log.entity.js';

export interface CreateConsultationLogDto {
  sellerId: string;
  workflowSessionId?: string;
  customerId?: string;
  recommendedProducts?: RecommendedProduct[];
  purchasedProducts?: PurchasedProduct[];
  resultStatus?: ConsultationResultStatus;
  consultationDurationMinutes?: number;
  notes?: string;
  customerProfile?: {
    skinType?: string[];
    concerns?: string[];
    preferences?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface UpdateConsultationLogDto {
  purchasedProducts?: PurchasedProduct[];
  resultStatus?: ConsultationResultStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsultationFilter {
  sellerId?: string;
  resultStatus?: ConsultationResultStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface ConsultationStats {
  totalConsultations: number;
  completedConsultations: number;
  conversionRate: number;
  averageDuration: number;
  totalRecommendations: number;
  totalPurchases: number;
}

export class ConsultationLogService {
  constructor(private readonly logRepository: Repository<SellerConsultationLog>) {}

  async create(dto: CreateConsultationLogDto): Promise<SellerConsultationLog> {
    const log = this.logRepository.create({
      ...dto,
      recommendedProducts: dto.recommendedProducts || [],
      purchasedProducts: dto.purchasedProducts || [],
      resultStatus: dto.resultStatus || 'pending',
    });

    return this.logRepository.save(log);
  }

  async update(id: string, dto: UpdateConsultationLogDto): Promise<SellerConsultationLog> {
    const log = await this.findById(id);
    if (!log) {
      throw new Error('Consultation log not found');
    }

    Object.assign(log, dto);
    return this.logRepository.save(log);
  }

  async findById(id: string): Promise<SellerConsultationLog | null> {
    return this.logRepository.findOne({ where: { id } });
  }

  async findBySellerId(
    sellerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SellerConsultationLog[]> {
    return this.logRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findByWorkflowSession(workflowSessionId: string): Promise<SellerConsultationLog | null> {
    return this.logRepository.findOne({ where: { workflowSessionId } });
  }

  async findByFilter(filter: ConsultationFilter): Promise<SellerConsultationLog[]> {
    const query = this.logRepository.createQueryBuilder('log');

    if (filter.sellerId) {
      query.andWhere('log.sellerId = :sellerId', { sellerId: filter.sellerId });
    }
    if (filter.resultStatus) {
      query.andWhere('log.resultStatus = :status', { status: filter.resultStatus });
    }
    if (filter.startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter.endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: filter.endDate });
    }

    return query.orderBy('log.createdAt', 'DESC').getMany();
  }

  async completeConsultation(
    id: string,
    purchasedProducts: PurchasedProduct[]
  ): Promise<SellerConsultationLog> {
    const log = await this.findById(id);
    if (!log) {
      throw new Error('Consultation log not found');
    }

    log.purchasedProducts = purchasedProducts;
    log.resultStatus = purchasedProducts.length > 0 ? 'completed' : 'no_purchase';

    // Update recommended products acceptance status
    if (log.recommendedProducts && purchasedProducts.length > 0) {
      const purchasedIds = new Set(purchasedProducts.map((p) => p.productId));
      log.recommendedProducts = log.recommendedProducts.map((rec) => ({
        ...rec,
        wasAccepted: purchasedIds.has(rec.productId),
      }));
    }

    return this.logRepository.save(log);
  }

  async getStats(sellerId: string, startDate?: Date, endDate?: Date): Promise<ConsultationStats> {
    const query = this.logRepository
      .createQueryBuilder('log')
      .where('log.sellerId = :sellerId', { sellerId });

    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const logs = await query.getMany();

    let completedConsultations = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalRecommendations = 0;
    let totalPurchases = 0;

    for (const log of logs) {
      if (log.resultStatus === 'completed') {
        completedConsultations++;
      }

      if (log.consultationDurationMinutes) {
        totalDuration += log.consultationDurationMinutes;
        durationCount++;
      }

      totalRecommendations += (log.recommendedProducts || []).length;
      totalPurchases += (log.purchasedProducts || []).length;
    }

    const totalConsultations = logs.length;
    const conversionRate = totalConsultations > 0
      ? (completedConsultations / totalConsultations) * 100
      : 0;
    const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    return {
      totalConsultations,
      completedConsultations,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 10) / 10,
      totalRecommendations,
      totalPurchases,
    };
  }

  async getRecentLogs(sellerId: string, days: number = 7): Promise<SellerConsultationLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findByFilter({
      sellerId,
      startDate,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.logRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
