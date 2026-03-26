/**
 * KpaStudentProfile Entity
 *
 * WO-KPA-A-RBAC-PROFILE-NORMALIZATION-V1
 *
 * 약대생 자격 프로필 (사용자 단위, 조직 무관).
 * kpa_members.university_name / student_year 대체.
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

@Entity('kpa_student_profiles')
export class KpaStudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  user_id!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  university_name!: string | null;

  @Column({ type: 'int', nullable: true })
  student_year!: number | null;

  @Column({ type: 'varchar', length: 50, default: 'enrolled' })
  enrollment_status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
