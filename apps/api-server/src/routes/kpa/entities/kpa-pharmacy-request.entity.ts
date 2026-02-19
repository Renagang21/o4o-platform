/**
 * KpaPharmacyRequest - 약국 서비스 신청 (개인 신원 확장)
 *
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * pharmacy_join은 "조직 가입"이 아니라 "개인 속성 변경"이다.
 * OrganizationJoinRequest에서 분리하여 독립 테이블로 관리.
 * 승인 시 User.pharmacist_role = 'pharmacy_owner' 설정.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PharmacyRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('kpa_pharmacy_requests')
@Index(['user_id', 'status'])
export class KpaPharmacyRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  pharmacy_name: string;

  @Column({ type: 'varchar', length: 20 })
  business_number: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pharmacy_phone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  owner_phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tax_invoice_email: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PharmacyRequestStatus;

  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
