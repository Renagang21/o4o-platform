import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('vendor_info')
@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['affiliateCode'], { unique: true, where: 'affiliateCode IS NOT NULL' })
export class VendorInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 판매자 정보
  @Column()
  vendorName: string;

  @Column({
    type: 'enum',
    enum: ['individual', 'business'],
    default: 'individual'
  })
  vendorType: string;

  // 연락처 정보
  @Column()
  contactName: string;

  @Column()
  contactPhone: string;

  @Column()
  contactEmail: string;

  // 판매 정보
  @Column('simple-array', { nullable: true })
  mainCategories: string[];

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  monthlyTarget: number;

  // 추천 정보
  @Column({ nullable: true, unique: true })
  affiliateCode: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true, default: 5 })
  affiliateRate: number;

  // 상태
  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  })
  status: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column('uuid', { nullable: true })
  approvedBy: string;

  // 실적 (주기적으로 업데이트)
  @Column({ default: 0 })
  totalSales: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}