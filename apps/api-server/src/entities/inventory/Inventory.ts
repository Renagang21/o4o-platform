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
import { VendorInfo } from '../VendorInfo';

@Entity('inventory')
@Index(['vendorId', 'productId'], { unique: true })
@Index(['sku'], { unique: true })
@Index(['status'])
@Index(['lastRestockedAt'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  vendorId: string;

  @ManyToOne(() => VendorInfo)
  @JoinColumn({ name: 'vendorId' })
  vendor: VendorInfo;

  @Column('uuid')
  productId: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  productCategory: string;

  // Quantity fields
  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reservedQuantity: number;

  @Column({ default: 0 })
  availableQuantity: number;

  @Column({ nullable: true })
  minQuantity: number;

  @Column({ nullable: true })
  maxQuantity: number;

  // Cost and value
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  unitCost: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalValue: number;

  // Location
  @Column({ nullable: true })
  warehouse: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  bin: string;

  // Status and tracking
  @Column({
    type: 'enum',
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  })
  status: string;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  expiryDate: Date;

  // Analytics
  @Column({ default: 0 })
  dailyAvgSales: number;

  @Column({ default: 0 })
  weeklyAvgSales: number;

  @Column({ default: 0 })
  monthlyAvgSales: number;

  @Column({ default: 0 })
  turnoverRate: number;

  @Column({ default: 0 })
  daysOfStock: number;

  // Reorder information
  @Column({ nullable: true })
  reorderPoint: number;

  @Column({ nullable: true })
  reorderQuantity: number;

  @Column({ nullable: true })
  leadTimeDays: number;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string;

  // Tracking dates
  @Column({ nullable: true })
  lastRestockedAt: Date;

  @Column({ nullable: true })
  lastSoldAt: Date;

  @Column({ nullable: true })
  lastCountedAt: Date;

  @Column({ nullable: true })
  lastAdjustedAt: Date;

  // Metadata
  @Column('jsonb', { nullable: true })
  attributes: Record<string, any>;

  @Column('jsonb', { nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Note: OneToMany relationships removed to prevent circular dependency
  // Use StockMovementRepository.find({ where: { inventoryId: inventory.id } }) to get movements
  // Use ReorderRuleRepository.find({ where: { inventoryId: inventory.id } }) to get reorder rules
  // Use InventoryAlertRepository.find({ where: { inventoryId: inventory.id } }) to get alerts
}