import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('supplier_info')
@Index(['userId'], { unique: true })
@Index(['status'])
export class SupplierInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 사업자 정보
  @Column()
  businessName: string;

  @Column({ nullable: true })
  businessNumber: string;

  @Column()
  contactName: string;

  @Column()
  contactPhone: string;

  @Column()
  contactEmail: string;

  // 사업 정보
  @Column({ nullable: true })
  businessAddress: string;

  @Column({ nullable: true })
  businessType: string;

  @Column('simple-array', { nullable: true })
  mainProducts: string[];

  // 정산 정보
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column({ nullable: true })
  accountHolder: string;

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

  // 설정
  @Column({ default: false })
  autoApproval: boolean;

  @Column('decimal', { precision: 5, scale: 2, nullable: true, default: 30 })
  preferredMarginRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true, default: 5 })
  preferredAffiliateRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}