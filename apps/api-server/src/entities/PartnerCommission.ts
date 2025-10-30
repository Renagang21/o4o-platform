import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Partner } from './Partner.js';
import { Product } from './Product.js';
import { Seller } from './Seller.js';
import { Order } from './Order.js';

export enum CommissionStatus {
  PENDING = 'pending',     // 주문 완료, 커미션 대기
  CONFIRMED = 'confirmed', // 반품 기간 경과, 커미션 확정
  PAID = 'paid',          // 커미션 지급 완료
  CANCELLED = 'cancelled', // 주문 취소/반품으로 커미션 취소
  DISPUTED = 'disputed'    // 분쟁 상태
}

export enum CommissionType {
  SALE = 'sale',           // 판매 커미션
  BONUS = 'bonus',         // 성과 보너스
  REFERRAL = 'referral',   // 추천 커미션
  TIER_BONUS = 'tier_bonus' // 등급 보너스
}

@Entity('partner_commissions')
@Index(['partnerId', 'status'])
@Index(['orderId'])
@Index(['sellerId', 'status'])
@Index(['status', 'createdAt'])
@Index(['commissionType', 'status'])
export class PartnerCommission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Partner relationship
  @Column({ type: 'uuid' })
  partnerId!: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner!: Partner;

  // Order relationship
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  // Product relationship
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  // Seller relationship
  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  // Commission Details
  @Column({ type: 'enum', enum: CommissionType, default: CommissionType.SALE })
  commissionType!: CommissionType;

  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status!: CommissionStatus;

  // Financial Information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number; // 주문 금액

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  productPrice!: number; // 해당 상품 판매가

  @Column({ type: 'integer' })
  quantity!: number; // 상품 수량

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number; // 커미션 비율 (%)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number; // 커미션 금액

  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // Tracking Information (문서 #66: 추적 시스템)
  @Column({ type: 'varchar', length: 20 })
  referralCode!: string; // 추천 코드

  @Column({ type: 'text', nullable: true })
  referralSource?: string; // 추천 소스 (URL, 캠페인 등)

  @Column({ type: 'varchar', length: 100, nullable: true })
  campaign?: string; // 캠페인 코드

  @Column({ type: 'json', nullable: true })
  trackingData?: {
    ip?: string;
    userAgent?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  };

  // Time Tracking
  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date; // 링크 클릭 시간

  @Column({ type: 'timestamp', nullable: true })
  convertedAt?: Date; // 주문 전환 시간

  @Column({ type: 'integer', nullable: true })
  conversionTimeMinutes?: number; // 클릭부터 전환까지 시간 (분)

  // Payment Information
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date; // 커미션 확정 시간

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date; // 지급 완료 시간

  @Column({ type: 'uuid', nullable: true })
  payoutBatchId?: string; // 지급 배치 ID

  @Column({ type: 'text', nullable: true })
  paymentReference?: string; // 지급 참조번호

  // Additional Information
  @Column({ type: 'text', nullable: true })
  notes?: string; // 관리자 메모

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string; // 취소 사유

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods
  
  // 커미션 계산 (문서 #66: 공급자가 설정한 단일 비율)
  static calculateCommission(
    productPrice: number,
    quantity: number,
    commissionRate: number
  ): { orderAmount: number; commission: number } {
    const orderAmount = productPrice * quantity;
    const commission = (orderAmount * commissionRate) / 100;

    return {
      orderAmount: Math.round(orderAmount * 100) / 100,
      commission: Math.round(commission * 100) / 100
    };
  }

  // 커미션 상태 확인
  isPending(): boolean {
    return this.status === CommissionStatus.PENDING;
  }

  isConfirmed(): boolean {
    return this.status === CommissionStatus.CONFIRMED;
  }

  isPaid(): boolean {
    return this.status === CommissionStatus.PAID;
  }

  isCancelled(): boolean {
    return this.status === CommissionStatus.CANCELLED;
  }

  canConfirm(): boolean {
    return this.status === CommissionStatus.PENDING;
  }

  canPay(): boolean {
    return this.status === CommissionStatus.CONFIRMED;
  }

  canCancel(): boolean {
    return [CommissionStatus.PENDING, CommissionStatus.CONFIRMED].includes(this.status);
  }

  // 전환 시간 계산
  calculateConversionTime(): void {
    if (this.clickedAt && this.convertedAt) {
      const diffMs = this.convertedAt.getTime() - this.clickedAt.getTime();
      this.conversionTimeMinutes = Math.round(diffMs / (1000 * 60));
    }
  }

  // 커미션 확정 (반품 기간 경과 후)
  confirm(): void {
    if (this.canConfirm()) {
      this.status = CommissionStatus.CONFIRMED;
      this.confirmedAt = new Date();
    }
  }

  // 커미션 지급
  pay(payoutBatchId: string, paymentReference?: string): void {
    if (this.canPay()) {
      this.status = CommissionStatus.PAID;
      this.paidAt = new Date();
      this.payoutBatchId = payoutBatchId;
      this.paymentReference = paymentReference;
    }
  }

  // 커미션 취소
  cancel(reason: string): void {
    if (this.canCancel()) {
      this.status = CommissionStatus.CANCELLED;
      this.cancellationReason = reason;
    }
  }

  // 분쟁 상태로 변경
  dispute(reason: string): void {
    this.status = CommissionStatus.DISPUTED;
    this.notes = reason;
  }

  // 분쟁 해결
  resolveDispute(newStatus: CommissionStatus.CONFIRMED | CommissionStatus.CANCELLED): void {
    if (this.status === CommissionStatus.DISPUTED) {
      this.status = newStatus;
    }
  }

  // 커미션 요약 정보
  getSummary(): {
    orderId: string;
    productName: string;
    orderAmount: number;
    commissionRate: number;
    totalCommission: number;
    status: string;
    createdAt: Date;
  } {
    return {
      orderId: this.orderId,
      productName: this.product?.name || 'Unknown Product',
      orderAmount: this.orderAmount,
      commissionRate: this.commissionRate,
      totalCommission: this.commissionAmount,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  // 성과 지표 계산
  getPerformanceMetrics(): {
    conversionTime: number | null;
    commissionPercentage: number;
    effectiveRate: number;
  } {
    return {
      conversionTime: this.conversionTimeMinutes,
      commissionPercentage: (this.commissionAmount / this.orderAmount) * 100,
      effectiveRate: this.commissionRate
    };
  }

  // 월별 집계를 위한 메서드
  getMonthKey(): string {
    return `${this.createdAt.getFullYear()}-${String(this.createdAt.getMonth() + 1).padStart(2, '0')}`;
  }

  // 주간 집계를 위한 메서드
  getWeekKey(): string {
    const startOfYear = new Date(this.createdAt.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((this.createdAt.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${this.createdAt.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }

  // 커미션 내역 검증
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.orderAmount <= 0) {
      errors.push('Order amount must be positive');
    }

    if (this.productPrice <= 0) {
      errors.push('Product price must be positive');
    }

    if (this.quantity <= 0) {
      errors.push('Quantity must be positive');
    }

    if (this.commissionRate < 0 || this.commissionRate > 100) {
      errors.push('Commission rate must be between 0 and 100');
    }

    if (this.commissionAmount < 0) {
      errors.push('Commission amount cannot be negative');
    }

    if (this.productPrice * this.quantity !== this.orderAmount) {
      errors.push('Order amount does not match product price * quantity');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}