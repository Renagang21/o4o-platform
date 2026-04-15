/**
 * KpaExternalExpertProfile Entity
 *
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 *
 * 외부전문가 프로필 (약사 면허 비보유 전문직 종사자).
 * membership_type='external_expert' 회원 승인 시 생성.
 * 한 사용자당 하나의 프로필 (user_id UNIQUE).
 *
 * ESM RULES (CLAUDE.md §2): import type + string-based relation
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from '../../../modules/auth/entities/User.js';

@Entity('kpa_external_expert_profiles')
export class KpaExternalExpertProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  user_id!: string;

  /** 전문 분야 (의사, 간호사, 연구원, 법무, 회계 등) */
  @Column({ type: 'varchar', length: 100 })
  expert_domain!: string;

  /** 소속 기관명 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  institution_name!: string | null;

  /** 기관 유형 (hospital, university, research_institute, law_firm, government, other) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  institution_type!: string | null;

  /** 부서/학과 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  department!: string | null;

  /** 자격증/면허 명칭 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  qualification!: string | null;

  /** 자격증 유형 (medical_license, nursing_license, bar_exam, cpa, phd, other) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  qualification_type!: string | null;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
