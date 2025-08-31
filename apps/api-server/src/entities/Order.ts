import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { OrderItem } from './OrderItem';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Legacy string literal type for compatibility
export type OrderStatusString = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  KAKAO_PAY = 'kakao_pay',
  NAVER_PAY = 'naver_pay',
  CASH_ON_DELIVERY = 'cash_on_delivery'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Customer fields for compatibility
  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ nullable: true, default: 'KRW' })
  currency?: string;

  @Column({ nullable: true })
  affiliateId?: string;

  @Column({ nullable: true })
  vendorId?: string;

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  items!: OrderItem[];

  // 주문 상태
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status!: OrderStatus;

  // 결제 정보
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod?: PaymentMethod;

  @Column({ nullable: true })
  paymentId?: string;

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  // 배송 정보
  @Column({ type: 'json' })
  shippingAddress!: {
    name: string;
    phone: string;
    address: string;
    addressDetail: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };

  @Column({ type: 'json', nullable: true })
  billingAddress?: {
    name: string;
    phone: string;
    address: string;
    addressDetail: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };

  @Column({ nullable: true })
  trackingNumber?: string;

  @Column({ nullable: true })
  carrierName?: string;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  paymentKey?: string;

  @Column({ nullable: true })
  shippedAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  // 메모 및 메타데이터
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    source?: string;
    referrer?: string;
    couponCode?: string;
    adminNotes?: string;
    lastStatusChange?: string;
    statusHistory?: any[];
    deliveredAt?: string;
    reviewRequested?: string;
    receiptUrl?: string;
    paymentKey?: string;
    [key: string]: any;
  };

  // Legacy support for billing
  @Column({ type: 'json', nullable: true })
  billing?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Legacy support for shipping
  @Column({ type: 'json', nullable: true })
  shipping?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    method?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
    status?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    estimatedDelivery?: Date;
    currentLocation?: string;
    cost?: number;
    paidBy?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  canCancel(): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
  }

  canRefund(): boolean {
    return [OrderStatus.DELIVERED].includes(this.status) && 
           this.paymentStatus === PaymentStatus.PAID;
  }

  getTotalItems(): number {
    return this.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }
}
