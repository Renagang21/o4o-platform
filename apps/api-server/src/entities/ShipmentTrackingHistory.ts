import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Shipment } from './Shipment.js';

@Entity('shipment_tracking_history')
export class ShipmentTrackingHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shipment_id' })
  shipmentId!: number;

  @ManyToOne(() => Shipment)
  @JoinColumn({ name: 'shipment_id' })
  shipment?: Shipment;

  @Column()
  status!: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'tracking_time', type: 'timestamp' })
  trackingTime!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}