/**
 * Member Qualification Entity
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 *
 * 사용자가 보유한 자격 상태를 추적한다.
 * (신청 이력은 QualificationRequest에서 관리)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { User } from '../../../modules/auth/entities/User.js';

export const QUALIFICATION_TYPES = ['instructor', 'content_provider', 'survey_operator', 'reviewer'] as const;
export type QualificationType = (typeof QUALIFICATION_TYPES)[number];

export type QualificationStatus = 'pending' | 'approved' | 'rejected';

@Entity('member_qualifications')
@Index(['user_id', 'qualification_type'], { unique: true })
@Index(['qualification_type', 'status'])
export class MemberQualification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 50 })
  qualification_type!: QualificationType;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: QualificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  requested_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at!: Date | null;

  /** 자격별 부가 정보 (bio, experience, organization 등) */
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relation (read-only, no circular import)
  user?: User;
}
