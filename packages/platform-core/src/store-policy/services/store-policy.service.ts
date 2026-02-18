/**
 * Store Policy Service
 *
 * WO-CORE-STORE-POLICY-SYSTEM-V1
 *
 * Core service for managing store policies across the platform.
 * Version-tracked: each update deactivates the old record and creates a new version.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { PlatformStorePolicy, type StorePolicyServiceKey } from '../entities/platform-store-policy.entity.js';

/**
 * Type guard to check if the source is a DataSource
 */
function isDataSource(source: DataSource | EntityManager): source is DataSource {
  return 'createQueryRunner' in source;
}

/**
 * Input for creating/updating a policy
 */
export interface UpdatePolicyInput {
  storeId: string;
  serviceKey: StorePolicyServiceKey;
  termsOfService?: string | null;
  privacyPolicy?: string | null;
  refundPolicy?: string | null;
  shippingPolicy?: string | null;
}

/**
 * Store Policy Service
 */
export class StorePolicyService {
  private source: DataSource | EntityManager;

  constructor(source: DataSource | EntityManager) {
    this.source = source;
  }

  private getRepo() {
    if (isDataSource(this.source)) {
      return this.source.getRepository(PlatformStorePolicy);
    }
    return this.source.getRepository(PlatformStorePolicy);
  }

  /**
   * Get the active policy for a store.
   * Returns null if no policy exists.
   */
  async getActivePolicy(
    storeId: string,
    serviceKey: StorePolicyServiceKey,
  ): Promise<PlatformStorePolicy | null> {
    return this.getRepo().findOne({
      where: { storeId, serviceKey, isActive: true },
    });
  }

  /**
   * Create or update a store policy.
   * Deactivates the previous active version and creates a new one.
   */
  async upsertPolicy(input: UpdatePolicyInput): Promise<PlatformStorePolicy> {
    const repo = this.getRepo();

    // Find current active policy
    const current = await repo.findOne({
      where: { storeId: input.storeId, serviceKey: input.serviceKey, isActive: true },
    });

    const nextVersion = current ? current.version + 1 : 1;

    // Deactivate current
    if (current) {
      await repo.update(current.id, { isActive: false });
    }

    // Create new version
    const newPolicy = repo.create({
      storeId: input.storeId,
      serviceKey: input.serviceKey,
      termsOfService: input.termsOfService ?? current?.termsOfService ?? null,
      privacyPolicy: input.privacyPolicy ?? current?.privacyPolicy ?? null,
      refundPolicy: input.refundPolicy ?? current?.refundPolicy ?? null,
      shippingPolicy: input.shippingPolicy ?? current?.shippingPolicy ?? null,
      isActive: true,
      version: nextVersion,
    });

    return repo.save(newPolicy);
  }

  /**
   * Get policy version history for a store.
   */
  async getPolicyHistory(
    storeId: string,
    serviceKey: StorePolicyServiceKey,
  ): Promise<PlatformStorePolicy[]> {
    return this.getRepo().find({
      where: { storeId, serviceKey },
      order: { version: 'DESC' },
    });
  }
}
