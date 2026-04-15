/**
 * Qualification Request Entity
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 *
 * 자격 신청 이력 및 심사 기록을 관리한다.
 * KpaApprovalRequest와 별도 — organization_id 불필요한 사용자 레벨 자격 처리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type QualificationRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('qualification_requests')
@Index(['user_id', 'qualification_type'])
@Index(['status', 'qualification_type'])
export class QualificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 50 })
  qualification_type!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: QualificationRequestStatus;

  /** 신청 시 제출한 데이터 (bio, experience 등) */
  @Column({ type: 'jsonb', default: '{}' })
  request_data!: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  review_note!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
