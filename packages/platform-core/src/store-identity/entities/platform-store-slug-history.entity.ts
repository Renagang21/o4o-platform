/**
 * PlatformStoreSlugHistory Entity
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Tracks slug changes for stores.
 * Used for:
 * - 301 redirect support
 * - Audit trail
 * - Enforcing 1-time change policy
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
  Index,
} from 'typeorm';

/**
 * Platform Store Slug History Entity
 *
 * Records all slug changes for a store.
 * The existence of a record indicates the store has already changed its slug.
 */
@Entity('platform_store_slug_history')
@Index('idx_platform_store_slug_history_store', ['storeId'])
@Index('idx_platform_store_slug_history_old_slug', ['oldSlug'])
export class PlatformStoreSlugHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The store that changed its slug.
   */
  @Column({ type: 'uuid', name: 'store_id' })
  storeId!: string;

  /**
   * The service key (for reference).
   */
  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: string;

  /**
   * The previous slug (before change).
   */
  @Column({ type: 'varchar', length: 120, name: 'old_slug' })
  oldSlug!: string;

  /**
   * The new slug (after change).
   */
  @Column({ type: 'varchar', length: 120, name: 'new_slug' })
  newSlug!: string;

  /**
   * The user who made the change.
   */
  @Column({ type: 'uuid', name: 'changed_by' })
  changedBy!: string;

  /**
   * When the change was made.
   */
  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}
