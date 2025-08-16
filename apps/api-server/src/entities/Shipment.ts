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

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @Column({ name: 'sender_name' })
  senderName!: string;

  @Column({ name: 'sender_phone' })
  senderPhone!: string;

  @Column({ name: 'sender_address', type: 'text' })
  senderAddress!: string;

  @Column({ name: 'sender_postal_code', nullable: true })
  senderPostalCode?: string;

  @Column({ name: 'recipient_name' })
  recipientName!: string;

  @Column({ name: 'recipient_phone' })
  recipientPhone!: string;

  @Column({ name: 'recipient_address', type: 'text' })
  recipientAddress!: string;

  @Column({ name: 'recipient_postal_code', nullable: true })
  recipientPostalCode?: string;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ name: 'insurance_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  insuranceAmount?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'json', nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'delivery_message', nullable: true })
  deliveryMessage?: string;

  @Column({ name: 'signature_required', type: 'boolean', default: false })
  signatureRequired!: boolean;

  @Column({ name: 'signature_image', type: 'text', nullable: true })
  signatureImage?: string;

  @Column({ name: 'failed_reason', type: 'text', nullable: true })
  failedReason?: string;

  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}