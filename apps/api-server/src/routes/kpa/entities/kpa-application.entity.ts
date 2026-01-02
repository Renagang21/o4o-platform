/**
 * KPA Application Entity
 * 약사회 신청 (가입신청, 서비스신청 등)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KpaOrganization } from './kpa-organization.entity.js';

export type KpaApplicationType = 'membership' | 'service' | 'other';
export type KpaApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

@Entity('kpa_applications')
export class KpaApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;  // 신청자 (auth-core 사용자 ID)

  @Column({ type: 'uuid' })
  organization_id: string;  // 신청 대상 조직

  @Column({ type: 'varchar', length: 50 })
  type: KpaApplicationType;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>;  // 신청 상세 데이터

  @Column({ type: 'varchar', length: 50, default: 'submitted' })
  status: KpaApplicationStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;  // 신청자 메모

  @Column({ type: 'uuid', nullable: true })
  reviewer_id: string | null;  // 검토자

  @Column({ type: 'text', nullable: true })
  review_comment: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => KpaOrganization)
  @JoinColumn({ name: 'organization_id' })
  organization: KpaOrganization;
}
