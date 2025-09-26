import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { ReferralRelationship } from './ReferralRelationship';
import { PartnerCommission } from './PartnerCommission';

@Entity('partner_users')
@Index(['userId'], { unique: true })
@Index(['partnerCode'], { unique: true })
@Index(['status'])
export class PartnerUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true, length: 10 })
  partnerCode: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  })
  status: string;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  // 추천 실적
  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  totalSignups: number;

  @Column({ default: 0 })
  totalOrders: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  // 수수료
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCommission: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  paidCommission: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  pendingCommission: number;

  // 설정
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  commissionRate: number; // 개별 수수료율

  @Column({
    type: 'enum',
    enum: ['bank', 'point'],
    default: 'bank'
  })
  paymentMethod: string;

  // 은행 계좌 정보
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountHolder: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations removed to prevent circular dependencies
  // Use lazy loading for reverse relationships:
  // referrals: () => ReferralRelationship[]
  // commissions: () => PartnerCommission[]
}