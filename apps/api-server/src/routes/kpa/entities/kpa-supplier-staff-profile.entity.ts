/**
 * KpaSupplierStaffProfile Entity
 *
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 *
 * 제약/의료기기 업체 직원 프로필.
 * membership_type='supplier_staff' 회원 승인 시 생성.
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

@Entity('kpa_supplier_staff_profiles')
export class KpaSupplierStaffProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  user_id!: string;

  /** 회사명 */
  @Column({ type: 'varchar', length: 200 })
  company_name!: string;

  /** 업체 유형 (pharmaceutical, medical_device, cosmetics, distributor, other) */
  @Column({ type: 'varchar', length: 100 })
  company_type!: string;

  /** 직책/직위 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  job_title!: string | null;

  /** 부서 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  department!: string | null;

  /** 사업자 등록번호 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  business_registration_number!: string | null;

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
