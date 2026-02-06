/**
 * KPA Member Entity
 * 약사회 회원 (auth-core 사용자와 연계)
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
import type { KpaOrganization } from './kpa-organization.entity.js';

export type KpaMemberRole = 'member' | 'operator' | 'admin';
export type KpaMemberStatus = 'pending' | 'active' | 'suspended' | 'withdrawn';
export type KpaMemberType = 'pharmacist' | 'student';

@Entity('kpa_members')
export class KpaMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;  // auth-core 사용자 ID

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50, default: 'member' })
  role: KpaMemberRole;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: KpaMemberStatus;

  @Column({ type: 'varchar', length: 50, default: 'pharmacist' })
  membership_type: KpaMemberType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  license_number: string | null;  // 약사 면허번호

  @Column({ type: 'varchar', length: 200, nullable: true })
  university_name: string | null;  // 약대생 재학 대학명

  @Column({ type: 'int', nullable: true })
  student_year: number | null;  // 약대생 학년 (1-6)

  @Column({ type: 'varchar', length: 200, nullable: true })
  pharmacy_name: string | null;  // 소속 약국명

  @Column({ type: 'varchar', length: 300, nullable: true })
  pharmacy_address: string | null;

  @Column({ type: 'date', nullable: true })
  joined_at: Date | null;  // 가입 승인일

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne('KpaOrganization')
  @JoinColumn({ name: 'organization_id' })
  organization: KpaOrganization;
}
