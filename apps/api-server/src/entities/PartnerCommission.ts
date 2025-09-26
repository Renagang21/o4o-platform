import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PartnerUser } from './PartnerUser';
import { Order } from './Order';
import { Product } from './Product';

@Entity('partner_commissions')
@Index(['partnerUserId'])
@Index(['status'])
@Index(['createdAt'])
export class PartnerCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  partnerUserId: string;

  @ManyToOne(() => PartnerUser)
  @JoinColumn({ name: 'partnerUserId' })
  partnerUser: PartnerUser;

  @Column('uuid')
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column('decimal', { precision: 12, scale: 2 })
  orderAmount: number;

  // 수수료 정보
  @Column('decimal', { precision: 5, scale: 2 })
  commissionRate: number;

  @Column('decimal', { precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  })
  status: string;

  // 지급 정보
  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column('uuid', { nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({
    type: 'enum',
    enum: ['bank', 'point'],
    nullable: true
  })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentReference: string;

  // 취소/조정
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column('text', { nullable: true })
  cancelledReason: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  adjustmentAmount: number;

  @Column('text', { nullable: true })
  adjustmentReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}