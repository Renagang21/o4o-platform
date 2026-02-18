/**
 * Payment Config Service
 *
 * WO-CORE-STORE-PAYMENT-CONFIG-V1
 *
 * Core service for managing store PG payment configurations.
 * Version-tracked: each update deactivates the old record and creates a new version.
 *
 * NOTE: Encryption/decryption is NOT handled here.
 * The caller (route handler) must encrypt before save and decrypt after read,
 * since crypto utilities live in api-server, not platform-core.
 */

import type { DataSource, EntityManager } from 'typeorm';
import {
  PlatformStorePaymentConfig,
  type PaymentConfigServiceKey,
  type PaymentProvider,
  type PaymentMode,
} from '../entities/platform-store-payment-config.entity.js';

/**
 * Input for creating/updating payment config
 */
export interface UpsertPaymentConfigInput {
  storeId: string;
  serviceKey: PaymentConfigServiceKey;
  provider: PaymentProvider;
  mode: PaymentMode;
  merchantId: string;
  apiKey?: string | null;
  apiSecret?: string | null;
}

/**
 * Payment Config Service
 */
export class PaymentConfigService {
  private source: DataSource | EntityManager;

  constructor(source: DataSource | EntityManager) {
    this.source = source;
  }

  private getRepo() {
    return this.source.getRepository(PlatformStorePaymentConfig);
  }

  /**
   * Get the active payment config for a store.
   */
  async getActiveConfig(
    storeId: string,
    serviceKey: PaymentConfigServiceKey,
  ): Promise<PlatformStorePaymentConfig | null> {
    return this.getRepo().findOne({
      where: { storeId, serviceKey, isActive: true },
    });
  }

  /**
   * Create or update payment config.
   * Deactivates the previous active version and creates a new one.
   */
  async upsertConfig(input: UpsertPaymentConfigInput): Promise<PlatformStorePaymentConfig> {
    const repo = this.getRepo();

    const current = await repo.findOne({
      where: { storeId: input.storeId, serviceKey: input.serviceKey, isActive: true },
    });

    const nextVersion = current ? current.version + 1 : 1;

    if (current) {
      await repo.update(current.id, { isActive: false });
    }

    const newConfig = repo.create({
      storeId: input.storeId,
      serviceKey: input.serviceKey,
      provider: input.provider,
      mode: input.mode,
      merchantId: input.merchantId,
      apiKey: input.apiKey ?? null,
      apiSecret: input.apiSecret ?? null,
      isActive: true,
      version: nextVersion,
    });

    return repo.save(newConfig);
  }
}
