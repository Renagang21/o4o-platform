/**
 * NetureContactMessage Entity
 *
 * WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * Neture service contact form submissions.
 * Types: supplier | partner | service | other
 * Status: new → in_progress → resolved
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ContactType = 'supplier' | 'partner' | 'service' | 'other';
export type ContactMessageStatus = 'new' | 'in_progress' | 'resolved';

@Entity('neture_contact_messages')
@Index(['contactType', 'status'])
@Index(['status', 'createdAt'])
@Index(['email'])
export class NetureContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, default: 'other' })
  contactType!: ContactType;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status!: ContactMessageStatus;

  /**
   * Legacy IP 원문 (WO-O4O-NETURE-CONTACT-PAGE-V1). 신규 저장은 원문을 넣지 않고 null.
   * 컬럼은 후속 cleanup WO 전까지 보존 — 여기서 drop 하지 않는다.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  /**
   * IP SHA256 hash (WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1).
   * 개인정보 최소수집 — 신규 저장부터 원문 대신 일방향 hash 만 기록.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipHash!: string | null;

  /**
   * 개인정보 수집·이용 동의 (WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1).
   * 공개 submit 시 true 필수 — 신규 저장은 항상 true(미동의는 400 으로 저장 자체 차단).
   */
  @Column({ type: 'boolean', default: false })
  privacyConsent!: boolean;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes!: string | null;

  /**
   * 알림 발송 결과 (WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1).
   * 형식: `inapp:<status>;email:<status>;autoreply:<status>` (예: inapp:sent;email:off;autoreply:off).
   * 접수 자체와 무관한 best-effort 기록 — 운영자가 알림 도달 여부를 추적하는 용도.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  notificationStatus!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;
}
