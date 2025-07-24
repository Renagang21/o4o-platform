import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn, Unique } from 'typeorm';
import { AffiliateUser } from './AffiliateUser';
import { User } from './User';

@Entity('referral_relationships')
@Index(['referralCode'])
@Index(['status'])
@Index(['signupDate'])
@Unique(['referrerId', 'referredId']) // 중복 추천 방지
export class ReferralRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  referrerId: string; // 추천인

  @ManyToOne(() => AffiliateUser)
  @JoinColumn({ name: 'referrerId' })
  referrer: AffiliateUser;

  @Column('uuid')
  referredId: string; // 피추천인

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referredId' })
  referred: User;

  @Column({ length: 10 })
  referralCode: string;

  @Column({ type: 'timestamp' })
  signupDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstOrderDate: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'expired'],
    default: 'pending'
  })
  status: string;

  // 추적 정보
  @Column({ nullable: true })
  signupIp: string;

  @Column({ nullable: true })
  signupDevice: string;

  @Column({
    type: 'enum',
    enum: ['kakao', 'facebook', 'band', 'direct', 'qr', 'other'],
    nullable: true
  })
  signupSource: string;

  @CreateDateColumn()
  createdAt: Date;

  // 단일 단계 추천 검증
  get isValidReferral(): boolean {
    // 자기 자신 추천 불가
    if (this.referrerId === this.referredId) {
      return false;
    }
    return true;
  }
}