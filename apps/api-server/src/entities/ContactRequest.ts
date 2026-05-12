/**
 * ContactRequest — 서비스별 협업/문의 요청
 *
 * WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
 *
 * 용도:
 * - KPA-Society Contact 페이지에서 제출된 협업·교육 문의
 * - 운영자 inbox 기반 문의 관리
 *
 * O4O Boundary: service_key 기준 격리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ContactRequestType = 'partner' | 'education';
export type ContactRequestStatus = 'pending' | 'reviewed' | 'closed';

@Entity('contact_requests')
@Index(['service_key', 'status'])
@Index(['type', 'status'])
@Index(['createdAt'])
export class ContactRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: 'kpa-society' })
  service_key: string;

  /** 문의 유형: partner = 단체 협력, education = 강의 개설 */
  @Column({ type: 'varchar', length: 50 })
  type: ContactRequestType;

  /** 단체/회사명 (partner 유형에서 주로 사용) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  organization_name: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  /** 강의 주제 또는 협업 주제 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ContactRequestStatus;

  /** 로그인 사용자가 제출한 경우 userId */
  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
