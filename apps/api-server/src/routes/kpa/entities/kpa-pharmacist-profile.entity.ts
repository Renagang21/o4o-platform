/**
 * KpaPharmacistProfile Entity
 *
 * WO-ROLE-NORMALIZATION-PHASE3-B-V1
 *
 * 약사 자격 프로필 (사용자 단위, 조직 무관).
 * users.pharmacist_role / pharmacist_function 대체.
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

@Entity('kpa_pharmacist_profiles')
export class KpaPharmacistProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  user_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  license_number!: string | null;

  @Column({ type: 'boolean', default: false })
  license_verified!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  activity_type!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verified_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
