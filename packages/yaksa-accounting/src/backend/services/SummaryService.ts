/**
 * SummaryService
 *
 * 집계 서비스
 *
 * === 기능 ===
 * - getMonthlySummary(): 월별 카테고리별 집계
 * - getAnnualSummary(): 연간 카테고리별 집계
 * - getExportData(): 총회 보고용 데이터 생성
 */

import { Repository, DataSource } from 'typeorm';
import { ExpenseRecord, ExpenseCategory, MonthlyClose } from '../entities';
import {
  MonthlySummaryDto,
  AnnualSummaryDto,
  CategorySummary,
  MonthSummary,
  ExportDataDto,
  ExportRecordDto,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../dto';

export class SummaryService {
  private expenseRepository: Repository<ExpenseRecord>;
  private closeRepository: Repository<MonthlyClose>;

  constructor(dataSource: DataSource) {
    this.expenseRepository = dataSource.getRepository(ExpenseRecord);
    this.closeRepository = dataSource.getRepository(MonthlyClose);
  }

  /**
   * 월별 요약
   */
  async getMonthlySummary(
    organizationId: string,
    yearMonth: string
  ): Promise<MonthlySummaryDto> {
    const startDate = `${yearMonth}-01`;
    const endDate = this.getMonthEndDate(yearMonth);

    // 카테고리별 집계
    const categoryStats = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('expense.category', 'category')
      .addSelect('SUM(expense.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('expense.organizationId = :organizationId', { organizationId })
      .andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('expense.category')
      .getRawMany();

    // 마감 상태
    const close = await this.closeRepository.findOne({
      where: { organizationId, yearMonth },
    });

    // 전체 합계
    const totalAmount = categoryStats.reduce(
      (sum, stat) => sum + Number(stat.totalAmount || 0),
      0
    );
    const totalCount = categoryStats.reduce(
      (sum, stat) => sum + Number(stat.count || 0),
      0
    );

    // 카테고리별 집계 변환
    const byCategory: CategorySummary[] = categoryStats.map((stat) => ({
      category: stat.category as ExpenseCategory,
      categoryLabel: CATEGORY_LABELS[stat.category as ExpenseCategory],
      totalAmount: Number(stat.totalAmount || 0),
      count: Number(stat.count || 0),
    }));

    return {
      organizationId,
      yearMonth,
      isClosed: close?.isClosed ?? false,
      closedAt: close?.closedAt?.toISOString(),
      totalAmount,
      totalCount,
      byCategory,
    };
  }

  /**
   * 연간 요약
   */
  async getAnnualSummary(
    organizationId: string,
    year: number
  ): Promise<AnnualSummaryDto> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // 카테고리별 연간 집계
    const categoryStats = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('expense.category', 'category')
      .addSelect('SUM(expense.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('expense.organizationId = :organizationId', { organizationId })
      .andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('expense.category')
      .getRawMany();

    // 월별 집계
    const monthlyStats = await this.expenseRepository
      .createQueryBuilder('expense')
      .select("TO_CHAR(expense.expenseDate, 'YYYY-MM')", 'yearMonth')
      .addSelect('SUM(expense.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('expense.organizationId = :organizationId', { organizationId })
      .andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("TO_CHAR(expense.expenseDate, 'YYYY-MM')")
      .orderBy("TO_CHAR(expense.expenseDate, 'YYYY-MM')", 'ASC')
      .getRawMany();

    // 마감 상태 조회
    const closes = await this.closeRepository.find({
      where: { organizationId },
    });
    const closeMap = new Map(closes.map((c) => [c.yearMonth, c.isClosed]));

    // 전체 합계
    const totalAmount = categoryStats.reduce(
      (sum, stat) => sum + Number(stat.totalAmount || 0),
      0
    );
    const totalCount = categoryStats.reduce(
      (sum, stat) => sum + Number(stat.count || 0),
      0
    );

    // 카테고리별 집계 변환
    const byCategory: CategorySummary[] = categoryStats.map((stat) => ({
      category: stat.category as ExpenseCategory,
      categoryLabel: CATEGORY_LABELS[stat.category as ExpenseCategory],
      totalAmount: Number(stat.totalAmount || 0),
      count: Number(stat.count || 0),
    }));

    // 월별 집계 변환
    const byMonth: MonthSummary[] = monthlyStats.map((stat) => ({
      yearMonth: stat.yearMonth,
      totalAmount: Number(stat.totalAmount || 0),
      count: Number(stat.count || 0),
      isClosed: closeMap.get(stat.yearMonth) ?? false,
    }));

    return {
      organizationId,
      year,
      totalAmount,
      totalCount,
      byCategory,
      byMonth,
    };
  }

  /**
   * 총회 보고용 내보내기 데이터 생성
   */
  async getExportData(
    organizationId: string,
    organizationName: string,
    year: number
  ): Promise<ExportDataDto> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // 모든 지출 조회
    const expenses = await this.expenseRepository.find({
      where: {
        organizationId,
      },
      order: {
        expenseDate: 'ASC',
        createdAt: 'ASC',
      },
    });

    // 해당 연도만 필터
    const filtered = expenses.filter((e) => {
      const date = e.expenseDate.toISOString().split('T')[0];
      return date >= startDate && date <= endDate;
    });

    // 카테고리별 집계
    const categoryMap = new Map<ExpenseCategory, { amount: number; count: number }>();
    for (const category of Object.values(ExpenseCategory)) {
      categoryMap.set(category, { amount: 0, count: 0 });
    }

    filtered.forEach((e) => {
      const stat = categoryMap.get(e.category)!;
      stat.amount += e.amount;
      stat.count += 1;
    });

    const byCategory: CategorySummary[] = [];
    categoryMap.forEach((stat, category) => {
      if (stat.count > 0) {
        byCategory.push({
          category,
          categoryLabel: CATEGORY_LABELS[category],
          totalAmount: stat.amount,
          count: stat.count,
        });
      }
    });

    // 레코드 변환
    const records: ExportRecordDto[] = filtered.map((e, index) => ({
      no: index + 1,
      date: e.expenseDate.toISOString().split('T')[0],
      category: CATEGORY_LABELS[e.category],
      description: e.description,
      paymentMethod: PAYMENT_METHOD_LABELS[e.paymentMethod],
      amount: e.amount,
      relatedPerson: e.relatedPerson,
    }));

    const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

    return {
      organizationId,
      organizationName,
      period: `${year}년`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAmount,
        totalCount: filtered.length,
        byCategory,
      },
      records,
    };
  }

  /**
   * 월의 마지막 날 계산
   */
  private getMonthEndDate(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  }
}
