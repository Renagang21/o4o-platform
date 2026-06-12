/**
 * ServiceLegalProfile Entity
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * 서비스(serviceKey)별 법정정보(상호 · 대표자 · 사업자등록번호 · 통신판매업 신고 ·
 * 주소 · 고객센터 · 개인정보보호책임자 · 호스팅 · 중개자 고지 등)를 저장한다.
 *
 * 핵심 원칙:
 *   - 이번 작업에서 실값/placeholder 를 seed 하지 않는다. 모든 법정정보 필드는 nullable.
 *   - serviceKey 당 1 row (unique). Admin 운영자가 서비스 개시 전 입력/수정한다.
 *   - 값이 없으면 public API 는 placeholder 없이 null 로 내려준다 (controller 책임).
 *   - is_active 로 공개 사용 여부 제어.
 *
 * Boundary: serviceKey 기준. legacy KPA `kpa_legal_documents`(정책 문서 전용)와 별개로,
 * 본 테이블은 "법정정보(사업자 정보)" 전용이며 4개 서비스 공통 구조다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('service_legal_profiles')
@Index(['service_key'], { unique: true })
export class ServiceLegalProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** neture | glycopharm | kpa-society | k-cosmetics (service-catalog canonical key) */
  @Column({ type: 'varchar', length: 50, unique: true })
  service_key!: string;

  // ── 사업자 법정정보 (모두 nullable — 실값/placeholder seed 금지) ──

  /** 상호 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  company_name!: string | null;

  /** 대표자명 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  representative_name!: string | null;

  /** 사업자등록번호 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  business_registration_number!: string | null;

  /** 통신판매업 신고번호 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ecommerce_registration_number!: string | null;

  /** 통신판매업 신고기관 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ecommerce_registration_agency!: string | null;

  /** 사업장 주소 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  business_address!: string | null;

  /** 고객센터 전화 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_service_phone!: string | null;

  /** 고객센터 이메일 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_service_email!: string | null;

  /** 개인정보보호책임자 — 성명 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  privacy_officer_name!: string | null;

  /** 개인정보보호책임자 — 이메일 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  privacy_officer_email!: string | null;

  /** 개인정보보호책임자 — 전화 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  privacy_officer_phone!: string | null;

  /** 호스팅 제공자 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  hosting_provider!: string | null;

  /** 사업자정보 확인(공정위 등) URL */
  @Column({ type: 'varchar', length: 500, nullable: true })
  business_info_verification_url!: string | null;

  /** 통신판매중개자 고지 문구 (Neture 등 중개 성격 검토 대상 — 기본값 seed 금지) */
  @Column({ type: 'text', nullable: true })
  mail_order_broker_notice!: string | null;

  /** 구매안전(에스크로) 서비스 정보 */
  @Column({ type: 'text', nullable: true })
  purchase_safety_service_info!: string | null;

  /** 추가 법적 고지 */
  @Column({ type: 'text', nullable: true })
  additional_legal_notice!: string | null;

  // ── 운영 메타 ──

  /** 공개 사용 여부. false 면 public API 에서 미반환. */
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
