/**
 * StoreMultilingualProductContentGroup Entity
 *
 * WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1
 *
 * Store-scoped multilingual product marketing content group.
 * This is not a normalized product-spec/usage document model; it stores a
 * free marketing content page group that QR/tablet surfaces can resolve by
 * product target + locale.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StoreMultilingualProductTargetKind = 'local' | 'listing';
export type StoreMultilingualProductContentSourceType =
  | 'store_created'
  | 'operator_hub'
  | 'supplier_offline_imported';
export type StoreMultilingualProductContentStatus = 'draft' | 'published' | 'archived';

@Entity({ name: 'store_multilingual_product_content_groups' })
@Index('IDX_store_multilingual_product_content_groups_org_status', ['organizationId', 'status'])
@Index('IDX_store_multilingual_product_content_groups_target', ['organizationId', 'targetKind', 'targetId'])
@Index('IDX_store_multilingual_product_content_groups_service_org', ['serviceKey', 'organizationId'])
@Index('UQ_store_multilingual_product_content_group_target_key', ['organizationId', 'targetKind', 'targetId', 'contentKey'], { unique: true })
export class StoreMultilingualProductContentGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey?: string | null;

  @Column({ name: 'target_kind', type: 'varchar', length: 30 })
  targetKind!: StoreMultilingualProductTargetKind;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  /**
   * Free key for future variants such as default/tour/event without hardcoding
   * content-type taxonomy in O4O. V1 uses 'default'.
   */
  @Column({ name: 'content_key', type: 'varchar', length: 80, default: 'default' })
  contentKey!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'default_locale', type: 'varchar', length: 10, default: 'ko' })
  defaultLocale!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 40, default: 'store_created' })
  sourceType!: StoreMultilingualProductContentSourceType;

  @Column({ name: 'source_ref_id', type: 'uuid', nullable: true })
  sourceRefId?: string | null;

  /**
   * WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
   * Hard-to-guess key for the unauthenticated public/QR landing. Issued lazily.
   */
  @Column({ name: 'public_key', type: 'varchar', length: 40, nullable: true })
  publicKey?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: StoreMultilingualProductContentStatus;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
