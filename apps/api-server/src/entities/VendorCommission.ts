import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VendorInfo } from './VendorInfo';

@Entity('vendor_commissions')
@Index(['vendorId', 'period'], { unique: true })
@Index(['status'])
@Index(['period'])
@Index(['createdAt'])
export class VendorCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  vendorId: string;

  @ManyToOne(() => VendorInfo)
  @JoinColumn({ name: 'vendorId' })
  vendor: VendorInfo;

  // Period information
  @Column()
  period: string; // Format: YYYY-MM

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  // Sales data
  @Column({ default: 0 })
  totalOrders: number;

  @Column({ default: 0 })
  completedOrders: number;

  @Column({ default: 0 })
  cancelledOrders: number;

  @Column({ default: 0 })
  refundedOrders: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  grossSales: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  netSales: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  // Commission calculation
  @Column('decimal', { precision: 5, scale: 2 })
  commissionRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  baseCommission: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  bonusCommission: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalCommission: number;

  // Deductions
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  platformFee: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  transactionFee: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  refundDeduction: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  otherDeductions: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalDeductions: number;

  // Final amounts
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  netCommission: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  previousBalance: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalPayable: number;

  // Affiliate commissions (if vendor is also affiliate)
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  affiliateEarnings: number;

  @Column({ default: 0 })
  affiliateClicks: number;

  @Column({ default: 0 })
  affiliateConversions: number;

  // Product performance
  @Column({ default: 0 })
  totalProductsSold: number;

  @Column({ default: 0 })
  uniqueProductsSold: number;

  @Column('jsonb', { nullable: true })
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    commission: number;
  }[];

  // Category performance
  @Column('jsonb', { nullable: true })
  categoryBreakdown: {
    category: string;
    orders: number;
    revenue: number;
    commission: number;
  }[];

  // Status and approval
  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'approved', 'paid', 'disputed', 'cancelled'],
    default: 'draft'
  })
  status: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column('text', { nullable: true })
  approvalNotes: string;

  // Payment information
  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ nullable: true })
  paidAt: Date;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  paidAmount: number;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankName: string;

  // Dispute handling
  @Column({ default: false })
  isDisputed: boolean;

  @Column('text', { nullable: true })
  disputeReason: string;

  @Column({ nullable: true })
  disputedAt: Date;

  @Column({ nullable: true })
  disputeResolvedAt: Date;

  @Column('text', { nullable: true })
  disputeResolution: string;

  // Adjustments
  @Column('jsonb', { nullable: true })
  adjustments: {
    date: Date;
    type: string;
    amount: number;
    reason: string;
    createdBy: string;
  }[];

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAdjustments: number;

  // Invoice
  @Column({ nullable: true })
  invoiceNumber: string;

  @Column({ nullable: true })
  invoiceUrl: string;

  @Column({ nullable: true })
  invoiceGeneratedAt: Date;

  // Notes and metadata
  @Column('text', { nullable: true })
  internalNotes: string;

  @Column('text', { nullable: true })
  vendorNotes: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // Calculation details (for transparency)
  @Column('jsonb', { nullable: true })
  calculationDetails: {
    orders: Array<{
      orderId: string;
      orderDate: Date;
      amount: number;
      commission: number;
      status: string;
    }>;
    deductions: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}