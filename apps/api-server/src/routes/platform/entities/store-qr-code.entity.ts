/**
 * StoreQrCode Entity
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 *
 * 매장 QR 코드 (Display Domain).
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 * organization_id로 멀티테넌트 격리.
 * Neture FK 금지 — library_item_id는 논리적 참조만.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_qr_codes' })
@Index('IDX_store_qr_codes_org_active', ['organizationId', 'isActive'])
export class StoreQrCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_qr_codes_org')
  organizationId!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'library_item_id', type: 'uuid', nullable: true })
  libraryItemId?: string | null;

  @Column({ name: 'landing_type', type: 'varchar', length: 50 })
  landingType!: string;

  @Column({ name: 'landing_target_id', type: 'varchar', length: 500, nullable: true })
  landingTargetId?: string | null;

  @Column({ type: 'varchar', length: 200, unique: true })
  @Index('IDX_store_qr_codes_slug', { unique: true })
  slug!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1
  //   landingType='page' 콘텐츠 하단에 상담 요청 버튼을 노출할지 여부 (기본 OFF — 기존 QR 회귀 0).
  //   본문 HTML 에 버튼을 박지 않고 설정값 + landing 렌더러로 처리(콘텐츠 재사용성 보존).
  @Column({ name: 'consultation_cta_enabled', type: 'boolean', default: false })
  consultationCtaEnabled!: boolean;

  // 버튼 문구. NULL 이면 프론트 기본값('상담 요청하기') 사용.
  @Column({ name: 'consultation_cta_label', type: 'varchar', length: 100, nullable: true })
  consultationCtaLabel?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
