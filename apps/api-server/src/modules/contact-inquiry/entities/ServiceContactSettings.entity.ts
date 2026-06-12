/**
 * ServiceContactSettings Entity
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * 서비스(serviceKey)별 Contact Us 문의 수신·알림 설정을 저장한다.
 *   - in-app 알림 사용 여부 (기본 활성)
 *   - 이메일 알림 사용 여부 (기본 비활성) + 수신 이메일 목록
 *   - 문의 유형 구성 / 공개 안내 문구
 *
 * 핵심 원칙:
 *   - 수신 이메일을 코드에 하드코딩하지 않는다. Admin 설정에서만 입력.
 *   - 실값/placeholder 를 seed 하지 않는다. recipient_emails 기본 빈 배열.
 *   - serviceKey 당 1 row (unique). row 가 없으면 in-app=on / email=off 기본값으로 간주(controller 책임).
 *   - 설정 미비로 문의 접수 자체를 실패시키지 않는다.
 *
 * Boundary: serviceKey 기준. V1 소비처 = glycopharm / k-cosmetics
 * (Neture/KPA 는 자체 contact 구조 유지 → 본 설정 적용 대상 아님).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 문의 유형 1건 구성. */
export interface ContactInquiryTypeConfig {
  value: string;
  label: string;
  enabled: boolean;
}

@Entity('service_contact_settings')
@Index(['service_key'], { unique: true })
export class ServiceContactSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** glycopharm | k-cosmetics (service-catalog canonical key) */
  @Column({ type: 'varchar', length: 50, unique: true })
  service_key!: string;

  // ── 알림 채널 ──

  /** in-app 운영자 알림 사용 여부 (기본 활성). */
  @Column({ type: 'boolean', default: true })
  in_app_notification_enabled!: boolean;

  /** 이메일 알림 사용 여부 (기본 비활성 — 수신자 설정 후 활성). */
  @Column({ type: 'boolean', default: false })
  email_notification_enabled!: boolean;

  /** 문의 알림 수신 이메일 목록 (Admin 입력. 하드코딩 금지). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  recipient_emails!: string[];

  // ── 문의 유형 / 안내 문구 ──

  /** 문의 유형 구성([{value,label,enabled}]). null 이면 공통 기본 유형 사용. */
  @Column({ type: 'jsonb', nullable: true })
  inquiry_types!: ContactInquiryTypeConfig[] | null;

  /** 개인정보 수집·이용 동의 안내 문구 (plain text). */
  @Column({ type: 'text', nullable: true })
  privacy_notice!: string | null;

  /** 접수 완료 안내 문구 (plain text). */
  @Column({ type: 'text', nullable: true })
  completion_notice!: string | null;

  // ── 운영 메타 ──

  /** 설정 활성 여부. */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  /** 마지막 수정자 user id */
  @Column({ type: 'uuid', nullable: true })
  updated_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
