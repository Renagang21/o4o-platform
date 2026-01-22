/**
 * KPA Join Inquiry Entity
 *
 * WO-KPA-JOIN-CONVERSION-V1
 *
 * 지부/분회/약국 참여 문의 수집
 * 최소 입력(연락처)만으로 문의 접수 가능
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type JoinInquiryType = 'branch' | 'division' | 'pharmacy';
export type JoinInquiryStatus = 'new' | 'contacted' | 'converted' | 'closed';

@Entity('kpa_join_inquiries')
@Index(['type', 'status'])
@Index(['status', 'created_at'])
export class KpaJoinInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 문의 유형
   * - branch: 지부 도입 문의
   * - division: 분회 참여 문의
   * - pharmacy: 약국 참여 문의
   */
  @Column({ type: 'varchar', length: 50 })
  type: JoinInquiryType;

  /**
   * 연락처 (이메일 또는 전화번호)
   * 필수 입력 항목
   */
  @Column({ type: 'varchar', length: 255 })
  contact: string;

  /**
   * 문의 내용 (선택)
   */
  @Column({ type: 'text', nullable: true })
  message: string | null;

  /**
   * 처리 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: JoinInquiryStatus;

  /**
   * 관리자 메모
   */
  @Column({ type: 'text', nullable: true })
  admin_note: string | null;

  /**
   * 메타데이터
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /**
   * 연락 완료 시간
   */
  @Column({ type: 'timestamp', nullable: true })
  contacted_at: Date | null;
}
