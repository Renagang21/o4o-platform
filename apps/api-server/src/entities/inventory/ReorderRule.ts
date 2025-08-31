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
import { Inventory } from './Inventory';

@Entity('reorder_rules')
@Index(['inventoryId'], { unique: true })
@Index(['isActive'])
@Index(['lastTriggeredAt'])
export class ReorderRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  inventoryId: string;

  @ManyToOne(() => Inventory, inventory => inventory.reorderRules)
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;

  @Column({ default: true })
  isActive: boolean;

  // Reorder trigger conditions
  @Column({
    type: 'enum',
    enum: ['min_quantity', 'forecast', 'fixed_schedule', 'manual'],
    default: 'min_quantity'
  })
  triggerType: string;

  @Column({ nullable: true })
  minQuantity: number;

  @Column({ nullable: true })
  maxQuantity: number;

  @Column({ nullable: true })
  reorderPoint: number;

  @Column({ nullable: true })
  reorderQuantity: number;

  // Forecast-based reordering
  @Column({ nullable: true })
  forecastDays: number;

  @Column({ nullable: true })
  safetyStockDays: number;

  @Column({ nullable: true })
  seasonalityFactor: number;

  // Fixed schedule reordering
  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'],
    nullable: true
  })
  scheduleFrequency: string;

  @Column({ nullable: true })
  scheduleDayOfWeek: number; // 0-6 for Sunday-Saturday

  @Column({ nullable: true })
  scheduleDayOfMonth: number; // 1-31

  @Column({ nullable: true })
  scheduleTime: string; // HH:mm format

  @Column({ nullable: true })
  nextScheduledReorder: Date;

  // Supplier information
  @Column('uuid', { nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string;

  @Column({ nullable: true })
  supplierEmail: string;

  @Column({ nullable: true })
  leadTimeDays: number;

  // Order constraints
  @Column({ nullable: true })
  minOrderQuantity: number;

  @Column({ nullable: true })
  maxOrderQuantity: number;

  @Column({ nullable: true })
  orderMultiple: number; // Order must be multiple of this quantity

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxOrderValue: number;

  // Approval workflow
  @Column({ default: false })
  requiresApproval: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  approvalThreshold: number;

  @Column('simple-array', { nullable: true })
  approverEmails: string[];

  // Auto-order settings
  @Column({ default: false })
  autoCreatePurchaseOrder: boolean;

  @Column({ default: false })
  autoSendToSupplier: boolean;

  @Column({ nullable: true })
  purchaseOrderTemplate: string;

  // Notification settings
  @Column({ default: true })
  notifyOnTrigger: boolean;

  @Column({ default: true })
  notifyOnOrder: boolean;

  @Column({ default: true })
  notifyOnDelivery: boolean;

  @Column('simple-array', { nullable: true })
  notificationEmails: string[];

  // Performance tracking
  @Column({ default: 0 })
  timesTriggered: number;

  @Column({ default: 0 })
  ordersCreated: number;

  @Column({ default: 0 })
  totalQuantityOrdered: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalValueOrdered: number;

  @Column({ nullable: true })
  lastTriggeredAt: Date;

  @Column({ nullable: true })
  lastOrderedAt: Date;

  @Column({ nullable: true })
  lastDeliveredAt: Date;

  // Advanced settings
  @Column('jsonb', { nullable: true })
  costOptimization: {
    enabled?: boolean;
    targetServiceLevel?: number;
    holdingCostPerUnit?: number;
    orderingCost?: number;
  };

  @Column('jsonb', { nullable: true })
  demandForecasting: {
    method?: string; // 'moving_average', 'exponential_smoothing', 'arima'
    historicalDays?: number;
    trendAdjustment?: boolean;
    seasonalAdjustment?: boolean;
  };

  @Column('jsonb', { nullable: true })
  customRules: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}