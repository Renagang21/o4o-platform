import { DataSource, Repository } from 'typeorm';
import { FeePayment, PaymentMethod, PaymentStatus } from '../entities/FeePayment.js';
import { FeeInvoiceService } from './FeeInvoiceService.js';
import { FeeLogService } from './FeeLogService.js';
import { FeeSyncService } from './FeeSyncService.js';

export interface CreatePaymentDto {
  invoiceId: string;
  memberId: string;
  amount: number;
  method: PaymentMethod;
  paidAt?: Date;
  /** E-commerce Core 주문 ID - 연회비: subscription, 단일 결제: retail */
  ecommerceOrderId?: string;
  // PG 결제 정보
  pgProvider?: string;
  transactionId?: string;
  approvalNumber?: string;
  cardOrBankName?: string;
  lastFourDigits?: string;
  // 수납 정보
  collectorId?: string;
  collectorName?: string;
  note?: string;
}

export interface PaymentFilters {
  memberId?: string;
  invoiceId?: string;
  status?: PaymentStatus | PaymentStatus[];
  method?: PaymentMethod | PaymentMethod[];
  year?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * FeePaymentService - 회비 납부 관리 서비스
 *
 * E-commerce Core 통합 (Phase Y):
 * - 연회비 납부: OrderType = 'subscription'
 * - 단일 결제: OrderType = 'retail'
 * - ecommerceOrderId로 EcommerceOrder 연결
 */
export class FeePaymentService {
  private repo: Repository<FeePayment>;
  private invoiceService: FeeInvoiceService;
  private logService: FeeLogService;
  private syncService: FeeSyncService;
  private receiptCounter: number = 0;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeePayment);
    this.invoiceService = new FeeInvoiceService(dataSource);
    this.logService = new FeeLogService(dataSource);
    this.syncService = new FeeSyncService(dataSource);
  }

  /**
   * 납부 처리
   */
  async create(dto: CreatePaymentDto, actorId?: string): Promise<FeePayment> {
    // 청구서 확인
    const invoice = await this.invoiceService.findById(dto.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice "${dto.invoiceId}" not found`);
    }

    if (!invoice.canPay()) {
      throw new Error(`Cannot make payment for invoice with status "${invoice.status}"`);
    }

    // 잔액 확인
    const remainingAmount = invoice.getRemainingAmount();
    if (dto.amount > remainingAmount) {
      throw new Error(
        `Payment amount ${dto.amount} exceeds remaining amount ${remainingAmount}`
      );
    }

    // 영수증 번호 생성
    const receiptNumber = await this.generateReceiptNumber(invoice.year);

    const payment = this.repo.create({
      ...dto,
      paidAt: dto.paidAt || new Date(),
      status: 'pending',
      receiptNumber,
    });

    const saved = await this.repo.save(payment);

    // 납부 완료 처리
    await this.completePayment(saved.id, actorId);

    return await this.findById(saved.id) as FeePayment;
  }

  /**
   * 납부 완료 처리
   */
  async completePayment(id: string, actorId?: string): Promise<FeePayment> {
    const payment = await this.findById(id);
    if (!payment) {
      throw new Error(`Payment "${id}" not found`);
    }

    if (payment.status !== 'pending') {
      throw new Error(`Payment already processed with status "${payment.status}"`);
    }

    const previousState = { status: payment.status };
    payment.markAsCompleted();

    if (actorId) {
      payment.confirmedBy = actorId;
    }

    const saved = await this.repo.save(payment);

    // 청구서 업데이트
    const invoice = await this.invoiceService.processPayment(
      payment.invoiceId,
      payment.amount,
      actorId
    );

    // MembershipYear 동기화
    if (invoice.status === 'paid') {
      await this.syncService.syncToMembershipYear(invoice, payment);
    }

    // 로그 기록
    await this.logService.log({
      memberId: payment.memberId,
      entityType: 'payment',
      entityId: id,
      action: 'payment_completed',
      year: invoice.year,
      previousState,
      newState: { status: 'completed', amount: payment.amount },
      actorId,
      description: `납부 완료: ${payment.amount.toLocaleString()}원 (${payment.getMethodDisplayName()})`,
    });

    return saved;
  }

  /**
   * 납부 조회 (ID)
   */
  async findById(id: string): Promise<FeePayment | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['invoice'],
    });
  }

  /**
   * 영수증 번호로 조회
   */
  async findByReceiptNumber(receiptNumber: string): Promise<FeePayment | null> {
    return await this.repo.findOne({
      where: { receiptNumber },
      relations: ['invoice'],
    });
  }

  /** E-commerce Order ID로 조회 (Phase Y) */
  async findByEcommerceOrderId(ecommerceOrderId: string): Promise<FeePayment | null> {
    return await this.repo.findOne({
      where: { ecommerceOrderId },
      relations: ['invoice'],
    });
  }

  /**
   * 납부 목록 조회
   */
  async findAll(filters: PaymentFilters): Promise<{
    payments: FeePayment[];
    total: number;
  }> {
    const queryBuilder = this.repo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice');

    if (filters.memberId) {
      queryBuilder.andWhere('payment.memberId = :memberId', {
        memberId: filters.memberId,
      });
    }
    if (filters.invoiceId) {
      queryBuilder.andWhere('payment.invoiceId = :invoiceId', {
        invoiceId: filters.invoiceId,
      });
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queryBuilder.andWhere('payment.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        queryBuilder.andWhere('payment.status = :status', {
          status: filters.status,
        });
      }
    }
    if (filters.method) {
      if (Array.isArray(filters.method)) {
        queryBuilder.andWhere('payment.method IN (:...methods)', {
          methods: filters.method,
        });
      } else {
        queryBuilder.andWhere('payment.method = :method', {
          method: filters.method,
        });
      }
    }
    if (filters.year) {
      queryBuilder.andWhere('invoice.year = :year', { year: filters.year });
    }
    if (filters.fromDate) {
      queryBuilder.andWhere('payment.paidAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters.toDate) {
      queryBuilder.andWhere('payment.paidAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    queryBuilder.orderBy('payment.paidAt', 'DESC');

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    const [payments, total] = await queryBuilder.getManyAndCount();
    return { payments, total };
  }

  /**
   * 회원별 납부 내역
   */
  async findByMember(memberId: string): Promise<FeePayment[]> {
    return await this.repo.find({
      where: { memberId },
      relations: ['invoice'],
      order: { paidAt: 'DESC' },
    });
  }

  /**
   * 환불 처리
   */
  async refund(
    id: string,
    reason: string,
    actorId: string,
    refundAmount?: number
  ): Promise<FeePayment> {
    const payment = await this.findById(id);
    if (!payment) {
      throw new Error(`Payment "${id}" not found`);
    }

    if (!payment.canRefund()) {
      throw new Error(`Cannot refund payment with status "${payment.status}"`);
    }

    const amount = refundAmount ?? payment.amount;
    if (amount > payment.amount) {
      throw new Error(
        `Refund amount ${amount} exceeds payment amount ${payment.amount}`
      );
    }

    const previousState = {
      status: payment.status,
      refundAmount: payment.refundAmount,
    };

    payment.processRefund(amount, reason, actorId);

    const saved = await this.repo.save(payment);

    // 청구서 상태 업데이트 (환불 시 다시 미납 상태로)
    // TODO: 환불 금액만큼 paidAmount 차감 로직 추가

    // 로그 기록
    await this.logService.log({
      memberId: payment.memberId,
      entityType: 'payment',
      entityId: id,
      action: 'payment_refunded',
      previousState,
      newState: { status: 'refunded', refundAmount: amount, reason },
      actorId,
      description: `환불 처리: ${amount.toLocaleString()}원 - ${reason}`,
    });

    return saved;
  }

  /**
   * 납부 취소
   */
  async cancel(id: string, reason: string, actorId: string): Promise<FeePayment> {
    const payment = await this.findById(id);
    if (!payment) {
      throw new Error(`Payment "${id}" not found`);
    }

    if (payment.status !== 'pending') {
      throw new Error(`Cannot cancel payment with status "${payment.status}"`);
    }

    const previousState = { status: payment.status };
    payment.status = 'cancelled';

    const saved = await this.repo.save(payment);

    await this.logService.log({
      memberId: payment.memberId,
      entityType: 'payment',
      entityId: id,
      action: 'payment_cancelled',
      previousState,
      newState: { status: 'cancelled', reason },
      actorId,
      description: `납부 취소: ${reason}`,
    });

    return saved;
  }

  /**
   * 영수증 번호 생성
   *
   * 형식: YYYY-XXXXXX (예: 2025-000001)
   */
  private async generateReceiptNumber(year: number): Promise<string> {
    // 해당 연도의 마지막 영수증 번호 조회
    const lastPayment = await this.repo
      .createQueryBuilder('payment')
      .where('payment.receiptNumber LIKE :prefix', { prefix: `${year}-%` })
      .orderBy('payment.receiptNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(lastPayment.receiptNumber.split('-')[1], 10);
      nextNumber = lastNumber + 1;
    }

    return `${year}-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * 통계 조회
   */
  async getStatistics(
    year: number,
    organizationId?: string
  ): Promise<{
    totalPayments: number;
    totalAmount: number;
    byMethod: Record<PaymentMethod, { count: number; amount: number }>;
    byMonth: Array<{ month: number; count: number; amount: number }>;
  }> {
    const queryBuilder = this.repo
      .createQueryBuilder('payment')
      .leftJoin('payment.invoice', 'invoice')
      .where('invoice.year = :year', { year })
      .andWhere('payment.status = :status', { status: 'completed' });

    if (organizationId) {
      queryBuilder.andWhere('invoice.organizationId = :organizationId', {
        organizationId,
      });
    }

    const payments = await queryBuilder.getMany();

    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    // 결제 방법별 통계
    const byMethod: Record<PaymentMethod, { count: number; amount: number }> = {
      cash: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
      virtual_account: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      mobile: { count: 0, amount: 0 },
      pg: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    };

    for (const payment of payments) {
      byMethod[payment.method].count++;
      byMethod[payment.method].amount += payment.amount;
    }

    // 월별 통계
    const byMonth: Array<{ month: number; count: number; amount: number }> =
      Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0,
        amount: 0,
      }));

    for (const payment of payments) {
      const month = payment.paidAt.getMonth();
      byMonth[month].count++;
      byMonth[month].amount += payment.amount;
    }

    return {
      totalPayments,
      totalAmount,
      byMethod,
      byMonth,
    };
  }
}
