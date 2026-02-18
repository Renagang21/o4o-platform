/**
 * PlatformStorePolicy Entity
 *
 * WO-CORE-STORE-POLICY-SYSTEM-V1
 *
 * Central registry of store policies (terms, privacy, refund, shipping).
 * Version-tracked with soft deactivation for audit trail.
 *
 * ESM RULES (CLAUDE.md §4):
 * - Use string-based relation references
 * - Use type-only imports for related entities
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Service keys for policy ownership (same as slug)
 */
export type StorePolicyServiceKey =
  | 'glycopharm'
  | 'cosmetics'
  | 'kpa'
  | 'neture'
  | 'glucoseview';

/**
 * Platform Store Policy Entity
 *
 * Stores legal/operational policies per store.
 * Each update creates a new version (old record deactivated).
 * Only one active policy per (storeId, serviceKey) at a time.
 */
@Entity('platform_store_policies')
@Index('idx_platform_store_policies_store_service', ['storeId', 'serviceKey'])
@Index('idx_platform_store_policies_is_active', ['isActive'])
export class PlatformStorePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The ID of the store in its respective service table.
   */
  @Column({ type: 'uuid', name: 'store_id' })
  storeId!: string;

  /**
   * The service that owns this store.
   */
  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: StorePolicyServiceKey;

  /**
   * Terms of service text (HTML or Markdown).
   */
  @Column({ type: 'text', name: 'terms_of_service', nullable: true })
  termsOfService!: string | null;

  /**
   * Privacy policy text.
   */
  @Column({ type: 'text', name: 'privacy_policy', nullable: true })
  privacyPolicy!: string | null;

  /**
   * Refund policy text.
   */
  @Column({ type: 'text', name: 'refund_policy', nullable: true })
  refundPolicy!: string | null;

  /**
   * Shipping policy text.
   */
  @Column({ type: 'text', name: 'shipping_policy', nullable: true })
  shippingPolicy!: string | null;

  /**
   * Whether this is the currently active policy version.
   */
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  /**
   * Auto-incrementing version number per store.
   */
  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
