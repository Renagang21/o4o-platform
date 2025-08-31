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

@Entity('supplier_products')
@Index(['supplierId', 'sku'], { unique: true })
@Index(['status'])
@Index(['category'])
@Index(['lastUpdatedAt'])
export class SupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  supplierId: string;

  @ManyToOne(() => Supplier, supplier => supplier.products)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  // Product identification
  @Column()
  sku: string;

  @Column({ nullable: true })
  supplierSku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  upc: string;

  @Column({ nullable: true })
  ean: string;

  // Product information
  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  // Pricing
  @Column('decimal', { precision: 10, scale: 2 })
  supplierPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  msrp: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  mapPrice: number; // Minimum advertised price

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  marginRate: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  calculatedSellingPrice: number;

  @Column({ nullable: true })
  currency: string;

  // Inventory
  @Column({ default: 0 })
  availableQuantity: number;

  @Column({ nullable: true })
  warehouseQuantity: number;

  @Column({ nullable: true })
  inTransitQuantity: number;

  @Column({ nullable: true })
  allocatedQuantity: number;

  @Column({ nullable: true })
  moq: number; // Minimum order quantity

  @Column({ nullable: true })
  orderMultiple: number; // Order must be multiple of this

  @Column({ nullable: true })
  maxOrderQuantity: number;

  @Column({ nullable: true })
  leadTimeDays: number;

  @Column({ nullable: true })
  restockDate: Date;

  // Physical attributes
  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  weight: number;

  @Column({ nullable: true })
  weightUnit: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  length: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  width: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  height: number;

  @Column({ nullable: true })
  dimensionUnit: string;

  @Column({ nullable: true })
  packageType: string;

  @Column({ nullable: true })
  unitsPerCase: number;

  // Images and media
  @Column({ nullable: true })
  primaryImageUrl: string;

  @Column('simple-array', { nullable: true })
  additionalImageUrls: string[];

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  documentUrl: string;

  // Status and availability
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'pending', 'discontinued', 'out_of_stock'],
    default: 'pending'
  })
  status: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false })
  isNew: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isOnSale: boolean;

  @Column({ nullable: true })
  salePrice: number;

  @Column({ nullable: true })
  saleStartDate: Date;

  @Column({ nullable: true })
  saleEndDate: Date;

  // Shipping
  @Column({ default: true })
  shippable: boolean;

  @Column({ default: false })
  freeShipping: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  shippingCost: number;

  @Column({ nullable: true })
  shippingClass: string;

  @Column({ nullable: true })
  hsCode: string; // Harmonized System code for customs

  // Specifications
  @Column('jsonb', { nullable: true })
  specifications: Record<string, any>;

  @Column('jsonb', { nullable: true })
  attributes: {
    name: string;
    value: string;
    unit?: string;
  }[];

  @Column('simple-array', { nullable: true })
  materials: string[];

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  size: string;

  @Column('simple-array', { nullable: true })
  variants: string[];

  // Compliance and certifications
  @Column({ nullable: true })
  countryOfOrigin: string;

  @Column('simple-array', { nullable: true })
  certifications: string[];

  @Column({ nullable: true })
  warrantyPeriod: string;

  @Column('text', { nullable: true })
  warrantyTerms: string;

  @Column({ nullable: true })
  returnPolicy: string;

  @Column({ default: false })
  hazardous: boolean;

  @Column({ default: false })
  fragile: boolean;

  @Column({ default: false })
  perishable: boolean;

  @Column({ nullable: true })
  expiryDate: Date;

  @Column({ nullable: true })
  shelfLife: string;

  // SEO and marketing
  @Column({ nullable: true })
  metaTitle: string;

  @Column('text', { nullable: true })
  metaDescription: string;

  @Column('simple-array', { nullable: true })
  keywords: string[];

  @Column({ nullable: true })
  slug: string;

  // Performance metrics
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  orderCount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  // Sync information
  @Column({ nullable: true })
  lastSyncAt: Date;

  @Column({ nullable: true })
  syncStatus: string;

  @Column('text', { nullable: true })
  syncError: string;

  @Column({ default: 0 })
  syncAttempts: number;

  // Mapping to internal product
  @Column('uuid', { nullable: true })
  mappedProductId: string;

  @Column('uuid', { nullable: true })
  mappedInventoryId: string;

  @Column({ default: false })
  autoUpdate: boolean;

  @Column({ default: false })
  priceOverride: boolean;

  @Column({ default: false })
  quantityOverride: boolean;

  // Additional metadata
  @Column('jsonb', { nullable: true })
  customFields: Record<string, any>;

  @Column('jsonb', { nullable: true })
  supplierData: Record<string, any>; // Raw data from supplier

  @Column({ nullable: true })
  lastUpdatedAt: Date;

  @Column({ nullable: true })
  lastUpdatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}