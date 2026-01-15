/**
 * PartnerApplication Entity
 * 파트너 신청 정보 (v1 - 접수만)
 *
 * WO-PARTNER-APPLICATION-V1
 *
 * Hard Rules:
 * - status 필드 없음 (v1)
 * - 승인/반려 필드 없음
 * - partner role 생성 로직 없음
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ServiceInterest = 'GlycoPharm' | 'K-Cosmetics' | 'GlucoseView';

@Entity('partner_applications')
@Index(['email', 'businessNumber'])
export class PartnerApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 업체명 (필수)
   */
  @Column({ type: 'varchar', length: 200, name: 'company_name' })
  companyName!: string;

  /**
   * 사업자번호 (필수)
   */
  @Column({ type: 'varchar', length: 50, name: 'business_number' })
  businessNumber!: string;

  /**
   * 담당자 이름 (필수)
   */
  @Column({ type: 'varchar', length: 100, name: 'contact_name' })
  contactName!: string;

  /**
   * 이메일 (필수)
   */
  @Column({ type: 'varchar', length: 200 })
  email!: string;

  /**
   * 연락처 (선택)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  /**
   * 희망 서비스 (선택)
   */
  @Column({ type: 'jsonb', name: 'service_interest', nullable: true })
  serviceInterest?: ServiceInterest[];

  /**
   * 메시지 (선택)
   */
  @Column({ type: 'text', nullable: true })
  message?: string;

  /**
   * 신청 일시
   */
  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt!: Date;

  // ❌ No status field in v1
  // ❌ No approval/rejection fields
  // ❌ No decidedAt/decidedBy fields
}
