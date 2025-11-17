import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';

// Enums
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed', 
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CARD = 'card',
  TRANSFER = 'transfer',
  VIRTUAL_ACCOUNT = 'virtual_account',
  KAKAO_PAY = 'kakao_pay',
  NAVER_PAY = 'naver_pay',
  PAYPAL = 'paypal',
  CASH_ON_DELIVERY = 'cash_on_delivery'
}

// Embedded types
export interface Address {
  recipientName: string;
  phone: string;
  email?: string;
  company?: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  city: string;
  state?: string;
  country: string;
  deliveryRequest?: string;
}

export interface OrderSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  handlingFee?: number;
  insuranceFee?: number;
  serviceFee?: number;
}

@Entity('orders')
@Index(['buyerId'])
@Index(['status'])
@Index(['orderDate'])
@Index(['orderNumber'], { unique: true })
@Index(['partnerId'])
@Index(['referralCode'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  // Buyer information
  @Column('uuid')
  buyerId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column({ nullable: true })
  buyerType: string; // UserRole

  @Column()
  buyerName: string;

  @Column()
  buyerEmail: string;

  @Column({ nullable: true })
  buyerGrade: string; // RetailerGrade

  // Order items (stored as JSON for simplicity)
  @Column('jsonb')
  items: OrderItem[];

  // Financial info
  @Column('jsonb')
  summary: OrderSummary;

  @Column({ default: 'KRW' })
  currency: string;

  // Status tracking
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Column({
    type: 'enum', 
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod: PaymentMethod;

  // Phase PG-1: Toss Payments integration fields
  @Column({ nullable: true })
  paymentKey: string; // Toss payment key from successful transaction

  @Column({ default: 'tosspayments' })
  paymentProvider: string; // Payment gateway provider

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date; // Actual payment approval timestamp

  // Addresses
  @Column('jsonb')
  billingAddress: Address;

  @Column('jsonb') 
  shippingAddress: Address;

  // Shipping & tracking
  @Column({ nullable: true })
  shippingMethod: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  trackingUrl: string;

  // Timestamps
  @CreateDateColumn()
  orderDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  shippingDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledDate: Date;

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  customerNotes: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  // Cancellation & returns
  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'text', nullable: true })
  returnReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  refundDate: Date;

  // Metadata
  @Column({
    type: 'enum',
    enum: ['web', 'mobile', 'api', 'admin'],
    default: 'web'
  })
  source: string;

  // Partner/Referral tracking
  @Column({ type: 'uuid', nullable: true })
  partnerId: string | null;

  @Column({ nullable: true })
  partnerName: string | null;

  @Column({ nullable: true })
  referralCode: string | null;

  // Standard timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-6);
    return `ORD${dateStr}${timeStr}`;
  }

  calculateTotal(): number {
    return this.summary.subtotal + this.summary.shipping + this.summary.tax - this.summary.discount;
  }

  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
  }

  canBeRefunded(): boolean {
    return this.status === OrderStatus.DELIVERED && this.paymentStatus === PaymentStatus.COMPLETED;
  }
}

// OrderItem interface (stored as JSON in Order.items)
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  productBrand?: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  // Supplier info
  supplierId: string;
  supplierName: string;

  // Seller info (Phase 3: 프론트엔드 계약 충족)
  sellerId: string;
  sellerName: string;

  // Phase PD-3/PD-4: SellerProduct integration
  sellerProductId?: string; // Reference to SellerProduct.id if order is via dropshipping

  // Phase PD-4: Immutable pricing snapshots (주문 생성 시 확정)
  // IMPORTANT: These values are frozen at order creation time
  basePriceSnapshot?: number; // 공급가 (supplier price) at order time
  salePriceSnapshot?: number; // 판매가 (seller's price) at order time
  marginAmountSnapshot?: number; // Margin (salePrice - basePrice)

  // Phase PD-2: Commission info (확정된 커미션 정보 - 주문 생성 시 확정)
  // IMPORTANT: Commission is fixed at order creation time
  // Product commission policy changes afterward do NOT affect this order
  commissionType?: 'rate' | 'fixed';
  commissionRate?: number; // Effective commission rate (0-1, e.g., 0.20 = 20%)
  commissionAmount?: number; // Confirmed commission amount in KRW

  // Product attributes at time of order
  attributes?: Record<string, string>;
  notes?: string;
}