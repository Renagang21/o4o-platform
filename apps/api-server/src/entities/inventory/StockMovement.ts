import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Inventory } from './Inventory';

@Entity('stock_movements')
@Index(['inventoryId', 'createdAt'])
@Index(['movementType'])
@Index(['referenceNumber'])
@Index(['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  inventoryId: string;

  @ManyToOne(() => Inventory, inventory => inventory.movements)
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;

  @Column({
    type: 'enum',
    enum: [
      'purchase',
      'sale',
      'return',
      'adjustment',
      'transfer',
      'damage',
      'theft',
      'expiry',
      'production',
      'consumption'
    ]
  })
  movementType: string;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  quantityBefore: number;

  @Column({ nullable: true })
  quantityAfter: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  unitCost: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalValue: number;

  // Reference information
  @Column({ nullable: true })
  referenceType: string; // 'order', 'invoice', 'transfer', etc.

  @Column({ nullable: true })
  referenceNumber: string;

  @Column('uuid', { nullable: true })
  referenceId: string;

  // Location information
  @Column({ nullable: true })
  fromLocation: string;

  @Column({ nullable: true })
  toLocation: string;

  @Column({ nullable: true })
  fromWarehouse: string;

  @Column({ nullable: true })
  toWarehouse: string;

  // User and reason
  @Column('uuid', { nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  reason: string;

  @Column('text', { nullable: true })
  notes: string;

  // Batch and serial tracking
  @Column({ nullable: true })
  batchNumber: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  expiryDate: Date;

  // Status
  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  })
  status: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  // Metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}