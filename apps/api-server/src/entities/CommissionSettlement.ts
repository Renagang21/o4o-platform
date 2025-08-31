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
import { Supplier } from './Supplier';

@Entity('commission_settlements')
@Index(['supplierId', 'period'], { unique: true })
@Index(['status'])
@Index(['period'])
@Index(['settlementDate'])
export class CommissionSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  // Settlement period
  @Column()
  period: string; // Format: YYYY-MM

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  settlementDate: Date;

  // Order statistics
  @Column({ default: 0 })
  totalOrders: number;

  @Column({ default: 0 })
  completedOrders: number;

  @Column({ default: 0 })
  returnedOrders: number;

  @Column({ default: 0 })
  cancelledOrders: number;

  // Product statistics
  @Column({ default: 0 })
  totalProductsSold: number;

  @Column({ default: 0 })
  uniqueProductsSold: number;

  @Column('jsonb', { nullable: true })
  productBreakdown: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    margin: number;
  }[];

  // Financial calculations
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  grossRevenue: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  returns: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  netRevenue: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  supplierCost: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  grossMargin: number;

  @Column('decimal', { precision: 5, scale: 2 })
  marginRate: number;

  // Platform fees and commissions
  @Column('decimal', { precision: 5, scale: 2 })
  platformCommissionRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  platformCommission: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  transactionFees: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  processingFees: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  shippingCosts: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalFees: number;

  // Supplier earnings
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  supplierEarnings: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  previousBalance: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalPayable: number;

  // Performance metrics
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  averageOrderValue: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  returnRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cancellationRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  fulfillmentRate: number;

  @Column({ nullable: true })
  averageDeliveryDays: number;

  // Category performance
  @Column('jsonb', { nullable: true })
  categoryBreakdown: {
    category: string;
    orders: number;
    products: number;
    revenue: number;
    margin: number;
  }[];

  // Warehouse/Location breakdown
  @Column('jsonb', { nullable: true })
  warehouseBreakdown: {
    warehouse: string;
    orders: number;
    products: number;
    revenue: number;
  }[];

  // Settlement status
  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'approved', 'processing', 'paid', 'failed', 'disputed'],
    default: 'draft'
  })
  status: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column('text', { nullable: true })
  approvalNotes: string;

  // Payment details
  @Column({
    type: 'enum',
    enum: ['bank_transfer', 'check', 'wire', 'paypal', 'other'],
    nullable: true
  })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ nullable: true })
  paymentDate: Date;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  paidAmount: number;

  @Column({ nullable: true })
  paymentConfirmation: string;

  // Banking information
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankRoutingNumber: string;

  @Column({ nullable: true })
  swiftCode: string;

  // Dispute handling
  @Column({ default: false })
  hasDispute: boolean;

  @Column('text', { nullable: true })
  disputeReason: string;

  @Column({ nullable: true })
  disputeRaisedAt: Date;

  @Column({ nullable: true })
  disputeResolvedAt: Date;

  @Column('text', { nullable: true })
  disputeResolution: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  disputeAmount: number;

  // Adjustments
  @Column('jsonb', { nullable: true })
  adjustments: {
    date: Date;
    type: string; // 'credit', 'debit', 'correction'
    amount: number;
    reason: string;
    approvedBy: string;
    referenceNumber?: string;
  }[];

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAdjustments: number;

  // Tax information
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  taxRate: number;

  @Column({ nullable: true })
  taxInvoiceNumber: string;

  // Documents
  @Column({ nullable: true })
  statementNumber: string;

  @Column({ nullable: true })
  statementUrl: string;

  @Column({ nullable: true })
  invoiceNumber: string;

  @Column({ nullable: true })
  invoiceUrl: string;

  @Column('simple-array', { nullable: true })
  supportingDocuments: string[];

  // Reconciliation
  @Column({ default: false })
  isReconciled: boolean;

  @Column({ nullable: true })
  reconciledAt: Date;

  @Column({ nullable: true })
  reconciledBy: string;

  @Column('text', { nullable: true })
  reconciliationNotes: string;

  // Currency and exchange
  @Column({ default: 'USD' })
  currency: string;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  exchangeRate: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  localCurrencyAmount: number;

  // Notes and metadata
  @Column('text', { nullable: true })
  internalNotes: string;

  @Column('text', { nullable: true })
  supplierNotes: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // Detailed breakdown for transparency
  @Column('jsonb', { nullable: true })
  detailedBreakdown: {
    orders: Array<{
      orderId: string;
      orderDate: Date;
      products: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      totalAmount: number;
      supplierShare: number;
      platformFee: number;
    }>;
    fees: Array<{
      type: string;
      description: string;
      amount: number;
      date: Date;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}