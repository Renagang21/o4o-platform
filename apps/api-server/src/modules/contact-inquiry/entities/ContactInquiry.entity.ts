/**
 * ContactInquiry Entity
 *
 * WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
 *
 * cross-service 공개 문의(Contact) 접수 저장소. serviceKey 기준.
 * V1 범위: GlycoPharm / K-Cosmetics (기존 contact 백엔드 없던 서비스).
 * Neture(NetureContactMessage) / KPA(ContactRequest) 는 기존 구조 유지 — 본 테이블 미사용.
 *
 * 원칙:
 *   - 공개 submit(인증 없음). 운영자 in-app 알림(notificationService)으로 연결.
 *   - 개인정보 최소 저장. IP 원문 미저장(ip_hash). HTML/script 는 컨트롤러에서 plain 처리.
 *   - 수신자 미설정이어도 접수(저장)는 성공 — notification_status 로 결과 기록.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('contact_inquiries')
@Index(['service_key', 'status'])
@Index(['service_key', 'created_at'])
export class ContactInquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** glycopharm | k-cosmetics (V1). service-catalog canonical key. */
  @Column({ type: 'varchar', length: 50 })
  service_key!: string;

  /** service_usage | account_permission | partnership | technical_issue | other */
  @Column({ type: 'varchar', length: 50, default: 'other' })
  inquiry_type!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organization_name!: string | null;

  @Column({ type: 'varchar', length: 300 })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  /** 개인정보 수집·이용 동의(필수 true 여야 접수). */
  @Column({ type: 'boolean', default: false })
  privacy_consent!: boolean;

  /** received | in_review | answered | closed | spam */
  @Column({ type: 'varchar', length: 20, default: 'received' })
  status!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  source_path!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  /** IP 원문 미저장 — sha256 hash 만(spam/중복 관찰용). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_hash!: string | null;

  /** sent | skipped_no_recipient | failed (in-app 알림 결과) */
  @Column({ type: 'varchar', length: 40, nullable: true })
  notification_status!: string | null;

  // ── 운영 처리(후속 Admin) — V1 미사용, nullable ──
  @Column({ type: 'timestamp', nullable: true })
  handled_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  handled_by!: string | null;

  @Column({ type: 'text', nullable: true })
  internal_note!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
