/**
 * KPA Member Service Entity
 * 서비스별 승인 상태 (Identity와 분리)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { KpaMember } from './kpa-member.entity.js';

export type KpaMemberServiceStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

@Entity('kpa_member_services')
@Unique(['member_id', 'service_key'])
export class KpaMemberService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  member_id: string;

  @Column({ type: 'varchar', length: 50 })
  service_key: string;  // 'kpa-a' | 'kpa-b' | 'kpa-c'

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: KpaMemberServiceStatus;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne('KpaMember')
  @JoinColumn({ name: 'member_id' })
  member: KpaMember;
}
