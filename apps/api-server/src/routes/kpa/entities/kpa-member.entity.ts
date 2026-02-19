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
import type { User } from '../../../modules/auth/entities/User.js';

export type KpaMemberRole = 'member' | 'operator' | 'admin';
export type KpaMemberStatus = 'pending' | 'active' | 'suspended' | 'withdrawn';
export type KpaIdentityStatus = 'active' | 'suspended' | 'withdrawn';
export type KpaMemberType = 'pharmacist' | 'student';

// Phase 5: 직능 분류 (프론트엔드 ActivityType 매핑)
export type KpaActivityType =
  | 'pharmacy_owner'      // 약국 개설약사
  | 'pharmacy_employee'   // 약국 근무약사
  | 'hospital'            // 의료기관
  | 'manufacturer'        // 의약품 제조
  | 'importer'            // 의약품 수입
  | 'wholesaler'          // 의약품 도매
  | 'other_industry'      // 기타 산업
  | 'government'          // 공공기관
  | 'school'              // 학교
  | 'other'               // 기타
  | 'inactive';           // 미활동

// Phase 5: 회비 분류 (2025 체계)
export type KpaFeeCategory =
  | 'A1_pharmacy_owner'
  | 'A2_pharma_manager'
  | 'B1_pharmacy_employee'
  | 'B2_pharma_company_employee'
  | 'C1_hospital'
  | 'C2_admin_edu_research'
  | 'D_fee_exempted';

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

  @Column({ type: 'varchar', length: 50, default: 'active' })
  identity_status: KpaIdentityStatus;

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

  // Phase 5: 직능 구조 분리
  @Column({ type: 'varchar', length: 50, nullable: true })
  activity_type: KpaActivityType | null;  // 취업 활동 유형

  @Column({ type: 'varchar', length: 50, nullable: true })
  fee_category: KpaFeeCategory | null;  // 회비 분류

  @Column({ type: 'date', nullable: true })
  joined_at: Date | null;  // 가입 승인일

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne('KpaOrganization')
  @JoinColumn({ name: 'organization_id' })
  organization: KpaOrganization;
}
