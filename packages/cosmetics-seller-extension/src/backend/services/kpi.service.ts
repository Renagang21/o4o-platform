/**
 * KPIService
 *
 * 판매원 KPI 관리 서비스
 */

import type { Repository } from 'typeorm';
import { SellerKPI, KPIPeriodType } from '../entities/seller-kpi.entity.js';
import type { ConsultationLogService } from './consultation-log.service.js';

export interface CreateKPIDto {
  sellerId: string;
  date: Date;
  periodType: KPIPeriodType;
  consultations?: number;
  conversions?: number;
  samplesGiven?: number;
  sampleConversions?: number;
  totalSales?: number;
  totalTransactions?: number;
  displayUpdates?: number;
  displayComplianceScore?: number;
  topSellingProducts?: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    revenue: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface KPISummary {
  daily: SellerKPI | null;
  weekly: SellerKPI | null;
  monthly: SellerKPI | null;
  trend: {
    consultationsChange: number;
    conversionsChange: number;
    salesChange: number;
  };
}

export class KPIService {
  constructor(
    private readonly kpiRepository: Repository<SellerKPI>,
    private readonly consultationLogService?: ConsultationLogService
  ) {}

  async create(dto: CreateKPIDto): Promise<SellerKPI> {
    // Calculate rates
    const conversionRate = dto.consultations && dto.consultations > 0
      ? ((dto.conversions || 0) / dto.consultations) * 100
      : 0;

    const sampleToPurchaseRate = dto.samplesGiven && dto.samplesGiven > 0
      ? ((dto.sampleConversions || 0) / dto.samplesGiven) * 100
      : 0;

    const averageTransactionValue = dto.totalTransactions && dto.totalTransactions > 0
      ? (dto.totalSales || 0) / dto.totalTransactions
      : 0;

    const kpi = this.kpiRepository.create({
      ...dto,
      conversionRate,
      sampleToPurchaseRate,
      averageTransactionValue,
    });

    return this.kpiRepository.save(kpi);
  }

  async findById(id: string): Promise<SellerKPI | null> {
    return this.kpiRepository.findOne({ where: { id } });
  }

  async findBySellerAndDate(
    sellerId: string,
    date: Date,
    periodType: KPIPeriodType
  ): Promise<SellerKPI | null> {
    return this.kpiRepository.findOne({
      where: { sellerId, date, periodType },
    });
  }

  async getDailyKPI(sellerId: string, date?: Date): Promise<SellerKPI | null> {
    const targetDate = date || new Date();
    return this.findBySellerAndDate(sellerId, targetDate, 'daily');
  }

  async getWeeklyKPI(sellerId: string, weekStartDate?: Date): Promise<SellerKPI | null> {
    const targetDate = weekStartDate || this.getWeekStart(new Date());
    return this.findBySellerAndDate(sellerId, targetDate, 'weekly');
  }

  async getMonthlyKPI(sellerId: string, monthStartDate?: Date): Promise<SellerKPI | null> {
    const targetDate = monthStartDate || this.getMonthStart(new Date());
    return this.findBySellerAndDate(sellerId, targetDate, 'monthly');
  }

  async getKPIHistory(
    sellerId: string,
    periodType: KPIPeriodType,
    limit: number = 30
  ): Promise<SellerKPI[]> {
    return this.kpiRepository.find({
      where: { sellerId, periodType },
      order: { date: 'DESC' },
      take: limit,
    });
  }

  async findBySellerId(
    sellerId: string,
    periodType?: KPIPeriodType,
    limit: number = 30
  ): Promise<SellerKPI[]> {
    const where: Record<string, unknown> = { sellerId };
    if (periodType) {
      where.periodType = periodType;
    }
    return this.kpiRepository.find({
      where,
      order: { date: 'DESC' },
      take: limit,
    });
  }

  async getSummary(sellerId: string, startDate?: Date, endDate?: Date): Promise<KPISummary> {
    const today = new Date();
    const daily = await this.getDailyKPI(sellerId, today);
    const weekly = await this.getWeeklyKPI(sellerId);
    const monthly = await this.getMonthlyKPI(sellerId);

    // Calculate trend (compare with previous period)
    const previousDaily = await this.getDailyKPI(
      sellerId,
      new Date(today.getTime() - 24 * 60 * 60 * 1000)
    );

    const trend = {
      consultationsChange: this.calculateChange(
        previousDaily?.consultations || 0,
        daily?.consultations || 0
      ),
      conversionsChange: this.calculateChange(
        previousDaily?.conversions || 0,
        daily?.conversions || 0
      ),
      salesChange: this.calculateChange(
        Number(previousDaily?.totalSales || 0),
        Number(daily?.totalSales || 0)
      ),
    };

    return { daily, weekly, monthly, trend };
  }

  async computeDailyKPI(sellerId: string, date: Date): Promise<SellerKPI> {
    // Get consultation stats for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let consultations = 0;
    let conversions = 0;

    if (this.consultationLogService) {
      const stats = await this.consultationLogService.getStats(sellerId, startOfDay, endOfDay);
      consultations = stats.totalConsultations;
      conversions = stats.completedConsultations;
    }

    // Check if KPI already exists
    let kpi = await this.findBySellerAndDate(sellerId, date, 'daily');

    if (kpi) {
      kpi.consultations = consultations;
      kpi.conversions = conversions;
      kpi.conversionRate = consultations > 0 ? (conversions / consultations) * 100 : 0;
      return this.kpiRepository.save(kpi);
    }

    return this.create({
      sellerId,
      date,
      periodType: 'daily',
      consultations,
      conversions,
    });
  }

  async computeWeeklyKPI(sellerId: string, weekStartDate?: Date): Promise<SellerKPI> {
    const startDate = weekStartDate || this.getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Aggregate daily KPIs
    const dailyKPIs = await this.kpiRepository
      .createQueryBuilder('kpi')
      .where('kpi.sellerId = :sellerId', { sellerId })
      .andWhere('kpi.periodType = :type', { type: 'daily' })
      .andWhere('kpi.date >= :startDate', { startDate })
      .andWhere('kpi.date <= :endDate', { endDate })
      .getMany();

    const aggregated = this.aggregateKPIs(dailyKPIs);

    let kpi = await this.findBySellerAndDate(sellerId, startDate, 'weekly');

    if (kpi) {
      Object.assign(kpi, aggregated);
      return this.kpiRepository.save(kpi);
    }

    return this.create({
      sellerId,
      date: startDate,
      periodType: 'weekly',
      ...aggregated,
    });
  }

  async computeMonthlyKPI(sellerId: string, monthStartDate?: Date): Promise<SellerKPI> {
    const startDate = monthStartDate || this.getMonthStart(new Date());
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);

    const dailyKPIs = await this.kpiRepository
      .createQueryBuilder('kpi')
      .where('kpi.sellerId = :sellerId', { sellerId })
      .andWhere('kpi.periodType = :type', { type: 'daily' })
      .andWhere('kpi.date >= :startDate', { startDate })
      .andWhere('kpi.date <= :endDate', { endDate })
      .getMany();

    const aggregated = this.aggregateKPIs(dailyKPIs);

    let kpi = await this.findBySellerAndDate(sellerId, startDate, 'monthly');

    if (kpi) {
      Object.assign(kpi, aggregated);
      return this.kpiRepository.save(kpi);
    }

    return this.create({
      sellerId,
      date: startDate,
      periodType: 'monthly',
      ...aggregated,
    });
  }

  private aggregateKPIs(kpis: SellerKPI[]): Partial<CreateKPIDto> {
    let consultations = 0;
    let conversions = 0;
    let samplesGiven = 0;
    let sampleConversions = 0;
    let totalSales = 0;
    let totalTransactions = 0;
    let displayUpdates = 0;

    for (const kpi of kpis) {
      consultations += kpi.consultations || 0;
      conversions += kpi.conversions || 0;
      samplesGiven += kpi.samplesGiven || 0;
      sampleConversions += kpi.sampleConversions || 0;
      totalSales += Number(kpi.totalSales) || 0;
      totalTransactions += kpi.totalTransactions || 0;
      displayUpdates += kpi.displayUpdates || 0;
    }

    return {
      consultations,
      conversions,
      samplesGiven,
      sampleConversions,
      totalSales,
      totalTransactions,
      displayUpdates,
    };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getMonthStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private calculateChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.kpiRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
