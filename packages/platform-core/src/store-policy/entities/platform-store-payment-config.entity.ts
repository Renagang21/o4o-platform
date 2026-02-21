/**
 * PlatformStorePaymentConfig Entity
 *
 * WO-CORE-STORE-PAYMENT-CONFIG-V1
 *
 * Per-store PG payment gateway configuration.
 * apiKey/apiSecret are stored encrypted (AES-256-CBC).
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
 * Supported PG providers
 */
export type PaymentProvider = 'inicis' | 'toss' | 'nicepay' | 'kakaopay';

/**
 * Payment environment mode
 */
export type PaymentMode = 'test' | 'live';

/**
 * Service keys (same as slug/policy)
 */
export type PaymentConfigServiceKey =
  | 'glycopharm'
  | 'cosmetics'
  | 'kpa'
  | 'neture'
  | 'glucoseview';

/**
 * Platform Store Payment Config Entity
 *
 * Stores PG credentials per store.
 * Each update creates a new version (old record deactivated).
 */
@Entity('platform_store_payment_configs')
@Index('idx_platform_store_payment_configs_store_service', ['storeId', 'serviceKey'])
@Index('idx_platform_store_payment_configs_is_active', ['isActive'])
export class PlatformStorePaymentConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'store_id' })
  storeId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: PaymentConfigServiceKey;

  /**
   * PG provider name
   */
  @Column({ type: 'varchar', length: 50 })
  provider!: PaymentProvider;

  /**
   * test or live
   */
  @Column({ type: 'varchar', length: 10, default: 'test' })
  mode!: PaymentMode;

  /**
   * Merchant ID (PG 상점 ID)
   */
  @Column({ type: 'varchar', length: 255, name: 'merchant_id' })
  merchantId!: string;

  /**
   * API Key — stored encrypted (AES-256-CBC)
   */
  @Column({ type: 'text', name: 'api_key', nullable: true })
  apiKey!: string | null;

  /**
   * API Secret — stored encrypted (AES-256-CBC)
   */
  @Column({ type: 'text', name: 'api_secret', nullable: true })
  apiSecret!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
