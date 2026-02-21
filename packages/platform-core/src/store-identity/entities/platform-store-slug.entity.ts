/**
 * PlatformStoreSlug Entity
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Central registry of all store slugs across the platform.
 * Ensures platform-wide uniqueness for store URLs.
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
 * Service keys for slug ownership
 */
export type StoreSlugServiceKey =
  | 'glycopharm'
  | 'cosmetics'
  | 'kpa'
  | 'neture'
  | 'glucoseview';

/**
 * Platform Store Slug Entity
 *
 * This entity maintains the global registry of all store slugs.
 * A slug can only be owned by one store across all services.
 */
@Entity('platform_store_slugs')
@Index('idx_platform_store_slugs_service_store', ['serviceKey', 'storeId'])
export class PlatformStoreSlug {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The URL-friendly identifier for the store.
   * Platform-wide unique.
   * Supports Korean characters.
   */
  @Column({ type: 'varchar', length: 120, unique: true })
  @Index('idx_platform_store_slugs_slug')
  slug!: string;

  /**
   * The ID of the store in its respective service table.
   * e.g., glycopharm_pharmacies.id or cosmetics_stores.id
   */
  @Column({ type: 'uuid', name: 'store_id' })
  storeId!: string;

  /**
   * The service that owns this store.
   * Used to route to the correct service.
   */
  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: StoreSlugServiceKey;

  /**
   * Whether the store is currently active.
   * Inactive stores may have their slugs reserved but not publicly accessible.
   */
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
