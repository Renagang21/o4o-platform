import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { Order } from './Order.js';
import { OrderStatus } from './Order.js';
import type { User } from './User.js';

// Event type enum
export enum OrderEventType {
  ORDER_CREATED = 'order_created',
  STATUS_CHANGE = 'status_change',
  SHIPPING_UPDATE = 'shipping_update',
  PAYMENT_UPDATE = 'payment_update',
  NOTE_ADDED = 'note_added',
  CANCELLATION = 'cancellation',
  REFUND = 'refund'
}

// Event payload interface (for additional data)
export interface OrderEventPayload {
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  cancellationReason?: string;
  refundAmount?: number;
  [key: string]: any;
}

@Entity('order_events')
@Index(['orderId'])
@Index(['createdAt'])
@Index(['type'])
export class OrderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Order relationship
  @Column('uuid')
  orderId: string;

  @ManyToOne('Order', 'events', { nullable: false })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  // Event information
  @Column({
    type: 'enum',
    enum: OrderEventType
  })
  type: OrderEventType;

  @Column({ type: 'varchar', nullable: true })
  prevStatus: string;

  @Column({ type: 'varchar', nullable: true })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  // Actor (who triggered this event)
  @Column({ type: 'uuid', nullable: true })
  actorId: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor?: User;

  @Column({ type: 'varchar', nullable: true })
  actorName: string; // Cached name for display

  @Column({ type: 'varchar', nullable: true })
  actorRole: string; // Role at time of event

  // Additional data
  @Column({ type: 'jsonb', nullable: true })
  payload: OrderEventPayload;

  // Source (where the event was triggered from)
  @Column({
    type: 'enum',
    enum: ['web', 'mobile', 'api', 'admin', 'system'],
    default: 'system'
  })
  source: string;

  // Timestamp
  @CreateDateColumn()
  createdAt: Date;
}
