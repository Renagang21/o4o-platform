/**
 * ExpenseService
 *
 * 지출 기록 관리 서비스
 *
 * === 제약 ===
 * - 해당 월이 마감되었으면 수정/삭제 차단
 * - organizationId는 반드시 컨텍스트에서 확인
 */

import { Repository, DataSource, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ExpenseRecord, ExpenseCategory, PaymentMethod } from '../entities';
import { MonthlyClose } from '../entities/MonthlyClose';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpensesFilter,
  ExpenseResponseDto,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../dto';

export class ExpenseService {
  private expenseRepository: Repository<ExpenseRecord>;
  private closeRepository: Repository<MonthlyClose>;

  constructor(dataSource: DataSource) {
    this.expenseRepository = dataSource.getRepository(ExpenseRecord);
    this.closeRepository = dataSource.getRepository(MonthlyClose);
  }

  /**
   * 지출 생성
   */
  async createExpense(
    organizationId: string,
    userId: string,
    dto: CreateExpenseDto
  ): Promise<ExpenseResponseDto> {
    // 마감 체크
    const yearMonth = dto.expenseDate.substring(0, 7);
    await this.checkNotClosed(organizationId, yearMonth);

    const expense = this.expenseRepository.create({
      organizationId,
      expenseDate: new Date(dto.expenseDate),
      amount: dto.amount,
      category: dto.category,
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      relatedPerson: dto.relatedPerson,
      receiptImageUrl: dto.receiptImageUrl,
      createdBy: userId,
    });

    const saved = await this.expenseRepository.save(expense);
    return this.toResponseDto(saved);
  }

  /**
   * 지출 수정
   */
  async updateExpense(
    organizationId: string,
    expenseId: string,
    dto: UpdateExpenseDto
  ): Promise<ExpenseResponseDto> {
    const expense = await this.findByIdAndOrg(organizationId, expenseId);

    // 기존 날짜의 마감 체크
    const oldYearMonth = this.formatYearMonth(expense.expenseDate);
    await this.checkNotClosed(organizationId, oldYearMonth);

    // 새 날짜가 있으면 해당 월도 체크
    if (dto.expenseDate) {
      const newYearMonth = dto.expenseDate.substring(0, 7);
      if (newYearMonth !== oldYearMonth) {
        await this.checkNotClosed(organizationId, newYearMonth);
      }
      expense.expenseDate = new Date(dto.expenseDate);
    }

    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.category !== undefined) expense.category = dto.category;
    if (dto.description !== undefined) expense.description = dto.description;
    if (dto.paymentMethod !== undefined) expense.paymentMethod = dto.paymentMethod;
    if (dto.relatedPerson !== undefined) expense.relatedPerson = dto.relatedPerson;
    if (dto.receiptImageUrl !== undefined) expense.receiptImageUrl = dto.receiptImageUrl;

    const saved = await this.expenseRepository.save(expense);
    return this.toResponseDto(saved);
  }

  /**
   * 지출 삭제
   */
  async deleteExpense(organizationId: string, expenseId: string): Promise<void> {
    const expense = await this.findByIdAndOrg(organizationId, expenseId);

    // 마감 체크
    const yearMonth = this.formatYearMonth(expense.expenseDate);
    await this.checkNotClosed(organizationId, yearMonth);

    await this.expenseRepository.remove(expense);
  }

  /**
   * 지출 목록 조회
   */
  async listExpenses(filter: ListExpensesFilter): Promise<{
    items: ExpenseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });

    // 월별 필터
    if (filter.yearMonth) {
      const startDate = `${filter.yearMonth}-01`;
      const endDate = this.getMonthEndDate(filter.yearMonth);
      queryBuilder.andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // 날짜 범위 필터
    if (filter.startDate) {
      queryBuilder.andWhere('expense.expenseDate >= :startDate', {
        startDate: filter.startDate,
      });
    }
    if (filter.endDate) {
      queryBuilder.andWhere('expense.expenseDate <= :endDate', {
        endDate: filter.endDate,
      });
    }

    // 카테고리 필터
    if (filter.category) {
      queryBuilder.andWhere('expense.category = :category', {
        category: filter.category,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.toResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  /**
   * 단일 조회
   */
  async getExpense(organizationId: string, expenseId: string): Promise<ExpenseResponseDto> {
    const expense = await this.findByIdAndOrg(organizationId, expenseId);
    return this.toResponseDto(expense);
  }

  /**
   * 마감 체크
   */
  private async checkNotClosed(organizationId: string, yearMonth: string): Promise<void> {
    const close = await this.closeRepository.findOne({
      where: { organizationId, yearMonth },
    });

    if (close?.isClosed) {
      throw new Error(`${yearMonth} 월은 마감되어 수정할 수 없습니다.`);
    }
  }

  /**
   * ID와 조직으로 조회
   */
  private async findByIdAndOrg(organizationId: string, expenseId: string): Promise<ExpenseRecord> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, organizationId },
    });

    if (!expense) {
      throw new Error('지출 기록을 찾을 수 없습니다.');
    }

    return expense;
  }

  /**
   * 월의 마지막 날 계산
   */
  private getMonthEndDate(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  }

  /**
   * Date를 YYYY-MM 형식으로 변환
   */
  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Entity를 Response DTO로 변환
   */
  private toResponseDto(expense: ExpenseRecord): ExpenseResponseDto {
    return {
      id: expense.id,
      organizationId: expense.organizationId,
      expenseDate: expense.expenseDate.toISOString().split('T')[0],
      amount: expense.amount,
      category: expense.category,
      categoryLabel: CATEGORY_LABELS[expense.category],
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      paymentMethodLabel: PAYMENT_METHOD_LABELS[expense.paymentMethod],
      relatedPerson: expense.relatedPerson,
      receiptImageUrl: expense.receiptImageUrl,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
