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

@Entity('inventory_alerts')
@Index(['inventoryId', 'status'])
@Index(['alertType', 'severity'])
@Index(['created_at'])
@Index(['acknowledgedAt'])
export class InventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  inventoryId: string;

  @ManyToOne(() => Inventory, { lazy: true })
  @JoinColumn({ name: 'inventoryId' })
  inventory: Promise<Inventory>;

  @Column({
    type: 'enum',
    enum: [
      'low_stock',
      'out_of_stock',
      'overstock',
      'expiry_warning',
      'expired',
      'reorder_point',
      'dead_stock',
      'slow_moving',
      'damage_reported',
      'theft_reported',
      'count_discrepancy',
      'price_change',
      'supplier_issue'
    ]
  })
  alertType: string;

  @Column({
    type: 'enum',
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    default: 'medium'
  })
  severity: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  // Alert details
  @Column({ nullable: true })
  currentQuantity: number;

  @Column({ nullable: true })
  thresholdQuantity: number;

  @Column({ nullable: true })
  recommendedAction: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedImpact: number; // Financial impact

  @Column({ nullable: true })
  daysUntilStockout: number;

  @Column({ nullable: true })
  daysOverstocked: number;

  @Column({ nullable: true })
  expiryDate: Date;

  @Column({ nullable: true })
  daysUntilExpiry: number;

  // Status tracking
  @Column({
    type: 'enum',
    enum: ['active', 'acknowledged', 'resolved', 'ignored', 'escalated'],
    default: 'active'
  })
  status: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isNotified: boolean;

  @Column({ nullable: true })
  acknowledgedBy: string;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column('text', { nullable: true })
  acknowledgmentNotes: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column('text', { nullable: true })
  resolutionNotes: string;

  // Notification details
  @Column('simple-array', { nullable: true })
  notifiedEmails: string[];

  @Column({ nullable: true })
  notifiedAt: Date;

  @Column({ default: 0 })
  notificationAttempts: number;

  @Column({ nullable: true })
  lastNotificationError: string;

  // Action tracking
  @Column({ nullable: true })
  actionTaken: string;

  @Column({ nullable: true })
  actionTakenBy: string;

  @Column({ nullable: true })
  actionTakenAt: Date;

  @Column('jsonb', { nullable: true })
  actionDetails: Record<string, any>;

  // Related information
  @Column('uuid', { nullable: true })
  relatedOrderId: string;

  @Column('uuid', { nullable: true })
  relatedMovementId: string;

  @Column('uuid', { nullable: true })
  relatedSupplierId: string;

  // Recurrence tracking
  @Column({ default: false })
  isRecurring: boolean;

  @Column({ default: 0 })
  occurrenceCount: number;

  @Column({ nullable: true })
  firstOccurredAt: Date;

  @Column({ nullable: true })
  lastOccurredAt: Date;

  // Auto-resolution
  @Column({ default: false })
  autoResolve: boolean;

  @Column({ nullable: true })
  autoResolveAfterHours: number;

  @Column({ nullable: true })
  scheduledResolveAt: Date;

  // Metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('jsonb', { nullable: true })
  context: {
    vendorId?: string;
    vendorName?: string;
    productId?: string;
    productName?: string;
    sku?: string;
    warehouse?: string;
    location?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}