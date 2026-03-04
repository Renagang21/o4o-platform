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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
