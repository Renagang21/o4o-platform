import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { SupplierProduct } from './SupplierProduct';
import { VendorInfo } from './VendorInfo';

@Entity('suppliers')
@Index(['status'])
@Index(['companyName'])
@Index(['contactEmail'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Company information
  @Column()
  companyName: string;

  @Column({
    type: 'enum',
    enum: ['manufacturer', 'distributor', 'wholesaler', 'dropshipper'],
    default: 'wholesaler'
  })
  supplierType: string;

  @Column({ nullable: true })
  businessRegistrationNumber: string;

  @Column({ nullable: true })
  taxNumber: string;

  // Contact information
  @Column()
  contactName: string;

  @Column()
  contactEmail: string;

  @Column()
  contactPhone: string;

  @Column({ nullable: true })
  contactPosition: string;

  @Column({ nullable: true })
  alternativeContact: string;

  // Address
  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  // Business terms
  @Column('decimal', { precision: 5, scale: 2, default: 15 })
  defaultMarginRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  minimumMarginRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  maximumMarginRate: number;

  @Column({ default: 30 })
  paymentTermDays: number;

  @Column({
    type: 'enum',
    enum: ['net30', 'net60', 'net90', 'cod', 'prepaid'],
    default: 'net30'
  })
  paymentTerms: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minimumOrderAmount: number;

  @Column({ nullable: true })
  currency: string;

  // Integration settings
  @Column({
    type: 'enum',
    enum: ['manual', 'api', 'csv', 'email'],
    default: 'manual'
  })
  integrationMethod: string;

  @Column({ nullable: true })
  apiEndpoint: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  apiSecret: string;

  @Column({ nullable: true })
  csvUploadUrl: string;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'monthly', 'realtime', 'manual'],
    default: 'manual'
  })
  syncFrequency: string;

  @Column({ nullable: true })
  lastSyncAt: Date;

  // Auto-approval settings
  @Column({ default: false })
  autoApproval: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  autoApprovalThreshold: number;

  @Column('simple-array', { nullable: true })
  autoApprovalCategories: string[];

  // Status and ratings
  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  })
  status: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ default: 0 })
  totalOrders: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalOrderValue: number;

  @Column({ default: 0 })
  totalProducts: number;

  @Column({ default: 0 })
  activeProducts: number;

  // Performance metrics
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  averageDeliveryDays: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  onTimeDeliveryRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  defectRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  returnRate: number;

  // Settlement information
  @Column({
    type: 'enum',
    enum: ['monthly', 'biweekly', 'weekly'],
    default: 'monthly'
  })
  settlementCycle: string;

  @Column({ nullable: true })
  settlementDay: number; // Day of month (1-31) or day of week (1-7)

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankAccountHolder: string;

  @Column({ nullable: true })
  bankSwiftCode: string;

  // Notes and metadata
  @Column('text', { nullable: true })
  notes: string;

  @Column('text', { nullable: true })
  internalNotes: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('simple-array', { nullable: true })
  preferredCategories: string[];

  @Column('simple-array', { nullable: true })
  brands: string[];

  // Compliance
  @Column({ nullable: true })
  certificateNumber: string;

  @Column({ nullable: true })
  certificateExpiryDate: Date;

  @Column('simple-array', { nullable: true })
  certifications: string[];

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedBy: string;

  // Additional settings
  @Column({ default: true })
  acceptReturns: boolean;

  @Column({ default: 30 })
  returnPeriodDays: number;

  @Column({ default: false })
  dropshippingAvailable: boolean;

  @Column({ default: false })
  provideTrackingInfo: boolean;

  @Column({ nullable: true })
  warehouseLocation: string;

  @Column('jsonb', { nullable: true })
  shippingMethods: {
    method: string;
    carrier: string;
    estimatedDays: number;
    cost: number;
  }[];

  @Column('jsonb', { nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany('SupplierProduct', 'supplier')
  products!: SupplierProduct[];

  @ManyToMany(() => VendorInfo)
  @JoinTable({
    name: 'supplier_vendors',
    joinColumn: { name: 'supplierId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'vendorId', referencedColumnName: 'id' }
  })
  vendors: VendorInfo[];
}