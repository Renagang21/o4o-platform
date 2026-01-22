/**
 * GlucoseView Pharmacist Entity (약사 프로필)
 *
 * 약사 회원 정보 (Core users 테이블과 분리)
 * user_id로 Core 사용자와 연결
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { GlucoseViewChapter } from './glucoseview-chapter.entity.js';

export type PharmacistApprovalStatus = 'pending' | 'approved' | 'rejected';
/**
 * Pharmacist Role
 * - pharmacist: 일반 약사
 * - operator: 운영자 (WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1)
 * - admin: 관리자
 */
export type PharmacistRole = 'pharmacist' | 'operator' | 'admin';

@Entity({ name: 'glucoseview_pharmacists', schema: 'public' })
@Index(['chapter_id', 'pharmacy_name'], { unique: true })
export class GlucoseViewPharmacist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Core users 테이블의 user_id (Soft FK)
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  user_id!: string;

  /**
   * 약사 면허번호
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  license_number!: string;

  /**
   * 본명
   */
  @Column({ type: 'varchar', length: 100 })
  real_name!: string;

  /**
   * 사이트에서 표시되는 이름
   */
  @Column({ type: 'varchar', length: 100 })
  display_name!: string;

  /**
   * 전화번호
   */
  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  /**
   * 이메일 (로그인 ID)
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email!: string;

  /**
   * 소속 분회 ID
   */
  @Column({ type: 'uuid' })
  @Index()
  chapter_id!: string;

  /**
   * 약국명 (같은 분회 내 중복 불가)
   */
  @Column({ type: 'varchar', length: 200 })
  pharmacy_name!: string;

  /**
   * 역할 (pharmacist, admin)
   */
  @Column({ type: 'varchar', length: 20, default: 'pharmacist' })
  role!: PharmacistRole;

  /**
   * 승인 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  approval_status!: PharmacistApprovalStatus;

  /**
   * 승인/거절 처리자 ID
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  approved_by?: string;

  /**
   * 승인/거절 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  approved_at?: Date;

  /**
   * 승인 거절 사유
   */
  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  /**
   * 활성화 여부
   */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @ManyToOne('GlucoseViewChapter')
  @JoinColumn({ name: 'chapter_id' })
  chapter!: GlucoseViewChapter;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
