import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { AffiliateUser } from './AffiliateUser';

@Entity('referral_clicks')
@Index(['referralCode'])
@Index(['clickedAt'])
@Index(['converted'])
@Index(['ip'])
export class ReferralClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  referralCode: string;

  @Column('uuid')
  affiliateUserId: string;

  @ManyToOne(() => AffiliateUser)
  @JoinColumn({ name: 'affiliateUserId' })
  affiliateUser: AffiliateUser;

  // 클릭 정보
  @Column({ type: 'timestamp' })
  clickedAt: Date;

  @Column({ length: 45 })
  ip: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referer: string;

  // 추적 정보
  @Column({
    type: 'enum',
    enum: ['kakao', 'facebook', 'band', 'direct', 'qr', 'other'],
    nullable: true
  })
  source: string;

  @Column('uuid', { nullable: true })
  productId: string;

  @Column({ nullable: true })
  landingPage: string;

  // 전환 정보
  @Column({ default: false })
  converted: boolean;

  @Column('uuid', { nullable: true })
  convertedUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}