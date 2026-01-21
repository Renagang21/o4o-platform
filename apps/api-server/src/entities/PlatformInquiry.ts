/**
 * PlatformInquiry - 플랫폼 레벨 문의
 *
 * 용도:
 * - SiteGuide 도입 상담 요청
 * - o4o 플랫폼 문의
 * - 기타 SaaS 사업자(플랫폼 관리자)에게 오는 문의
 *
 * 서비스 레벨 문의(각 서비스 운영자)와 구분됨
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type InquiryType = 'siteguide' | 'platform' | 'partnership' | 'other';
export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

@Entity('platform_inquiries')
@Index(['type', 'status'])
@Index(['status', 'createdAt'])
@Index(['email'])
export class PlatformInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 문의 유형
  @Column({
    type: 'varchar',
    length: 50,
    default: 'platform',
  })
  type: InquiryType;

  // 문의자 정보
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string;

  // 문의 내용
  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  // 상태 관리
  @Column({
    type: 'varchar',
    length: 20,
    default: 'new',
  })
  status: InquiryStatus;

  // 메타데이터
  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string; // 'siteguide.co.kr', 'neture.co.kr', etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string;

  // 관리자 메모
  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  // 알림 발송 여부
  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 처리 완료 시간
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;
}
