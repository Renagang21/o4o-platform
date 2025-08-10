import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orderId!: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column()
  trackingNumber!: string;

  @Column()
  carrier!: string; // cj, hanjin, logen, koreanpost

  @Column({
    type: 'enum',
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  })
  status!: string;

  @Column({ type: 'json', nullable: true })
  shippingAddress?: {
    name: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'json', nullable: true })
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    weight: number;
  }>;

  @Column({ nullable: true })
  currentLocation?: string;

  @Column({ nullable: true })
  labelUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ nullable: true })
  estimatedDelivery?: Date;

  @Column({ nullable: true })
  actualDelivery?: Date;

  @Column({ type: 'json', nullable: true })
  trackingEvents?: Array<{
    timestamp: Date;
    location: string;
    status: string;
    description: string;
  }>;

  @Column({ nullable: true })
  lastUpdated?: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}