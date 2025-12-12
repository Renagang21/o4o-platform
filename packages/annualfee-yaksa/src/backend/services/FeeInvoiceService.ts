import { DataSource, Repository, In } from 'typeorm';
import { FeeInvoice, InvoiceStatus, AmountBreakdown } from '../entities/FeeInvoice.js';
import { FeeCalculationService, MemberFeeContext } from './FeeCalculationService.js';
import { FeeLogService } from './FeeLogService.js';

export interface CreateInvoiceDto {
  memberId: string;
  organizationId: string;
  year: number;
  policyId?: string;
  amount: number;
  amountBreakdown?: AmountBreakdown;
  dueDate: string;
  note?: string;
}

export interface InvoiceFilters {
  year?: number;
  memberId?: string;
  organizationId?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  isOverdue?: boolean;
  limit?: number;
  offset?: number;
}

export interface BatchInvoiceResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ memberId: string; error: string }>;
}

/**
 * FeeInvoiceService
 *
 * 회비 청구 관리 서비스
 */
export class FeeInvoiceService {
  private repo: Repository<FeeInvoice>;
  private calculationService: FeeCalculationService;
  private logService: FeeLogService;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeeInvoice);
    this.calculationService = new FeeCalculationService(dataSource);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * 청구서 생성
   */
  async create(dto: CreateInvoiceDto, actorId?: string): Promise<FeeInvoice> {
    // 이미 해당 연도 청구서가 있는지 확인
    const existing = await this.repo.findOne({
      where: {
        memberId: dto.memberId,
        year: dto.year,
      },
    });
    if (existing) {
      throw new Error(
        `Invoice already exists for member ${dto.memberId} in year ${dto.year}`
      );
    }

    const invoice = this.repo.create({
      ...dto,
      status: 'pending',
      paidAmount: 0,
      syncedToMembershipYear: false,
    });

    const saved = await this.repo.save(invoice);

    // 로그 기록
    await this.logService.log({
      memberId: dto.memberId,
      entityType: 'invoice',
      entityId: saved.id,
      action: 'invoice_created',
      year: dto.year,
      newState: { amount: dto.amount, status: 'pending' },
      actorId,
      description: `${dto.year}년 회비 청구서 생성 (${dto.amount.toLocaleString()}원)`,
    });

    return saved;
  }

  /**
   * 청구서 조회 (ID)
   */
  async findById(id: string): Promise<FeeInvoice | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['payments'],
    });
  }

  /**
   * 청구서 조회 (회원 + 연도)
   */
  async findByMemberAndYear(
    memberId: string,
    year: number
  ): Promise<FeeInvoice | null> {
    return await this.repo.findOne({
      where: { memberId, year },
      relations: ['payments'],
    });
  }

  /**
   * 청구서 목록 조회
   */
  async findAll(filters: InvoiceFilters): Promise<{
    invoices: FeeInvoice[];
    total: number;
  }> {
    const queryBuilder = this.repo.createQueryBuilder('invoice');

    if (filters.year) {
      queryBuilder.andWhere('invoice.year = :year', { year: filters.year });
    }
    if (filters.memberId) {
      queryBuilder.andWhere('invoice.memberId = :memberId', {
        memberId: filters.memberId,
      });
    }
    if (filters.organizationId) {
      queryBuilder.andWhere('invoice.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queryBuilder.andWhere('invoice.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        queryBuilder.andWhere('invoice.status = :status', {
          status: filters.status,
        });
      }
    }
    if (filters.isOverdue) {
      const today = new Date().toISOString().split('T')[0];
      queryBuilder
        .andWhere('invoice.dueDate < :today', { today })
        .andWhere('invoice.status NOT IN (:...paidStatuses)', {
          paidStatuses: ['paid', 'cancelled', 'exempted'],
        });
    }

    queryBuilder.orderBy('invoice.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    const [invoices, total] = await queryBuilder.getManyAndCount();
    return { invoices, total };
  }

  /**
   * 회원별 청구서 목록
   */
  async findByMember(memberId: string): Promise<FeeInvoice[]> {
    return await this.repo.find({
      where: { memberId },
      relations: ['payments'],
      order: { year: 'DESC' },
    });
  }

  /**
   * 일괄 청구서 생성
   */
  async generateBulkInvoices(
    memberContexts: MemberFeeContext[],
    year: number,
    policyId: string,
    dueDate: string,
    actorId?: string
  ): Promise<BatchInvoiceResult> {
    const result: BatchInvoiceResult = {
      total: memberContexts.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // 이미 청구서가 있는 회원 확인
    const existingInvoices = await this.repo.find({
      where: {
        year,
        memberId: In(memberContexts.map((c) => c.memberId)),
      },
      select: ['memberId'],
    });
    const existingMemberIds = new Set(existingInvoices.map((i) => i.memberId));

    for (const context of memberContexts) {
      // 이미 청구서가 있으면 스킵
      if (existingMemberIds.has(context.memberId)) {
        result.skipped++;
        continue;
      }

      try {
        // 회비 계산
        const calcResult = await this.calculationService.calculateFee(
          context,
          year
        );

        // 면제 회원 처리
        if (calcResult.isExempt) {
          const invoice = await this.create(
            {
              memberId: context.memberId,
              organizationId: context.organizationId,
              year,
              policyId,
              amount: 0,
              amountBreakdown: calcResult.breakdown,
              dueDate,
            },
            actorId
          );
          invoice.status = 'exempted';
          invoice.exemptionReason = calcResult.exemptReason;
          await this.repo.save(invoice);
          result.created++;
          continue;
        }

        // 청구서 생성
        await this.create(
          {
            memberId: context.memberId,
            organizationId: context.organizationId,
            year,
            policyId,
            amount: calcResult.breakdown.finalAmount,
            amountBreakdown: calcResult.breakdown,
            dueDate,
          },
          actorId
        );
        result.created++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          memberId: context.memberId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 배치 로그 기록
    await this.logService.log({
      entityType: 'invoice',
      entityId: 'batch',
      action: 'batch_invoice_generated',
      year,
      data: {
        total: result.total,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
      },
      actorId,
      actorType: 'admin',
      description: `${year}년 회비 일괄 청구서 생성: ${result.created}건 생성, ${result.skipped}건 스킵, ${result.failed}건 실패`,
    });

    return result;
  }

  /**
   * 청구서 발송 처리
   */
  async markAsSent(id: string, actorId?: string): Promise<FeeInvoice> {
    const invoice = await this.findById(id);
    if (!invoice) {
      throw new Error(`Invoice "${id}" not found`);
    }

    if (invoice.status !== 'pending') {
      throw new Error(`Cannot send invoice with status "${invoice.status}"`);
    }

    const previousState = { status: invoice.status };
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    invoice.issuedAt = invoice.issuedAt || new Date();

    const saved = await this.repo.save(invoice);

    await this.logService.log({
      memberId: invoice.memberId,
      entityType: 'invoice',
      entityId: id,
      action: 'invoice_sent',
      year: invoice.year,
      previousState,
      newState: { status: 'sent' },
      actorId,
      description: `청구서 발송 완료`,
    });

    return saved;
  }

  /**
   * 청구서 취소
   */
  async cancel(
    id: string,
    reason: string,
    actorId: string
  ): Promise<FeeInvoice> {
    const invoice = await this.findById(id);
    if (!invoice) {
      throw new Error(`Invoice "${id}" not found`);
    }

    if (!invoice.canCancel()) {
      throw new Error(`Cannot cancel invoice with status "${invoice.status}"`);
    }

    const previousState = { status: invoice.status };
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = reason;
    invoice.cancelledBy = actorId;

    const saved = await this.repo.save(invoice);

    await this.logService.log({
      memberId: invoice.memberId,
      entityType: 'invoice',
      entityId: id,
      action: 'invoice_cancelled',
      year: invoice.year,
      previousState,
      newState: { status: 'cancelled', reason },
      actorId,
      description: `청구서 취소: ${reason}`,
    });

    return saved;
  }

  /**
   * 연체 상태 업데이트 (배치)
   */
  async updateOverdueStatus(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.repo
      .createQueryBuilder()
      .update(FeeInvoice)
      .set({ status: 'overdue' })
      .where('dueDate < :today', { today })
      .andWhere('status IN (:...statuses)', {
        statuses: ['pending', 'sent', 'partial'],
      })
      .execute();

    return result.affected || 0;
  }

  /**
   * 납부 처리 (FeePayment에서 호출)
   */
  async processPayment(
    id: string,
    paymentAmount: number,
    actorId?: string
  ): Promise<FeeInvoice> {
    const invoice = await this.findById(id);
    if (!invoice) {
      throw new Error(`Invoice "${id}" not found`);
    }

    const previousState = {
      status: invoice.status,
      paidAmount: invoice.paidAmount,
    };

    invoice.addPayment(paymentAmount);

    const saved = await this.repo.save(invoice);

    await this.logService.log({
      memberId: invoice.memberId,
      entityType: 'invoice',
      entityId: id,
      action: 'invoice_updated',
      year: invoice.year,
      previousState,
      newState: { status: saved.status, paidAmount: saved.paidAmount },
      actorId,
      description: `납부 처리: ${paymentAmount.toLocaleString()}원`,
    });

    return saved;
  }

  /**
   * 통계 조회
   */
  async getStatistics(year: number, organizationId?: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidCount: number;
    paidAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
    overdueCount: number;
    exemptedCount: number;
    collectionRate: number;
  }> {
    const queryBuilder = this.repo
      .createQueryBuilder('invoice')
      .where('invoice.year = :year', { year });

    if (organizationId) {
      queryBuilder.andWhere('invoice.organizationId = :organizationId', {
        organizationId,
      });
    }

    const invoices = await queryBuilder.getMany();

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);

    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const paidCount = paidInvoices.length;
    const paidAmount = paidInvoices.reduce((sum, i) => sum + i.paidAmount, 0);

    const unpaidInvoices = invoices.filter((i) =>
      ['pending', 'sent', 'partial', 'overdue'].includes(i.status)
    );
    const unpaidCount = unpaidInvoices.length;
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, i) => sum + i.getRemainingAmount(),
      0
    );

    const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
    const exemptedCount = invoices.filter((i) => i.status === 'exempted').length;

    const collectionRate =
      totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 10000) / 100 : 0;

    return {
      totalInvoices,
      totalAmount,
      paidCount,
      paidAmount,
      unpaidCount,
      unpaidAmount,
      overdueCount,
      exemptedCount,
      collectionRate,
    };
  }
}
