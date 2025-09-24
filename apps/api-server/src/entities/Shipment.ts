import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber?: string;

  @Column()
  carrier!: string;

  @Column({ name: 'carrier_code', nullable: true })
  carrierCode?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
    default: 'pending'
  })
  status!: string;

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'actual_delivery', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'estimated_delivery', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @Column({ name: 'shipping_address', type: 'json', nullable: true })
  shippingAddress?: {
    senderName?: string;
    senderPhone?: string;
    senderAddress?: string;
    senderPostalCode?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    recipientPostalCode?: string;
  };

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost!: number;


  @Column({ type: 'json', nullable: true })
  items?: any[];

  @Column({ name: 'current_location', type: 'text', nullable: true })
  currentLocation?: string;

  @Column({ name: 'label_url', type: 'text', nullable: true })
  labelUrl?: string;

  @Column({ name: 'tracking_events', type: 'json', nullable: true })
  trackingEvents?: any[];

  @Column({ name: 'last_updated', type: 'timestamp', nullable: true })
  lastUpdated?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}