/**
 * Store Slug Service
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Core service for managing store slugs across the platform.
 * All slug operations MUST go through this service.
 *
 * WO-CORE-STORE-SLUG-TRANSACTION-HARDENING-V1:
 * Supports both DataSource and EntityManager for transaction support.
 */

import type { DataSource, EntityManager, Repository } from 'typeorm';
import { PlatformStoreSlug, type StoreSlugServiceKey } from '../entities/platform-store-slug.entity.js';
import { PlatformStoreSlugHistory } from '../entities/platform-store-slug-history.entity.js';
import {
  validateSlug,
  generateSlugFromName,
  normalizeSlug,
  type SlugValidationError,
} from '../utils/slug-validation.js';

/**
 * Type guard to check if the source is a DataSource
 */
function isDataSource(source: DataSource | EntityManager): source is DataSource {
  return 'createQueryRunner' in source;
}

/**
 * Result of slug availability check
 */
export interface SlugAvailabilityResult {
  available: boolean;
  reason?: 'duplicate' | 'reserved' | 'invalid';
  validationError?: SlugValidationError;
}

/**
 * Options for reserving a slug
 */
export interface ReserveSlugOptions {
  storeId: string;
  serviceKey: StoreSlugServiceKey;
  slug: string;
}

/**
 * Options for changing a slug
 */
export interface ChangeSlugOptions {
  storeId: string;
  serviceKey: StoreSlugServiceKey;
  newSlug: string;
  changedBy: string;
}

/**
 * Store Slug Service
 *
 * Provides all operations for managing store slugs.
 *
 * Usage:
 * - With DataSource (standalone): new StoreSlugService(dataSource)
 * - With EntityManager (in transaction): new StoreSlugService(queryRunner.manager)
 */
export class StoreSlugService {
  private slugRepo: Repository<PlatformStoreSlug>;
  private historyRepo: Repository<PlatformStoreSlugHistory>;

  /**
   * Create a StoreSlugService instance.
   *
   * @param source - Either a DataSource or EntityManager (for transaction support)
   */
  constructor(source: DataSource | EntityManager) {
    if (isDataSource(source)) {
      this.slugRepo = source.getRepository(PlatformStoreSlug);
      this.historyRepo = source.getRepository(PlatformStoreSlugHistory);
    } else {
      // EntityManager - use within transaction
      this.slugRepo = source.getRepository(PlatformStoreSlug);
      this.historyRepo = source.getRepository(PlatformStoreSlugHistory);
    }
  }

  /**
   * Check if a slug is available for use
   */
  async checkAvailability(slug: string): Promise<SlugAvailabilityResult> {
    const normalized = normalizeSlug(slug);

    // Validate format
    const validation = validateSlug(normalized);
    if (!validation.valid) {
      return {
        available: false,
        reason: validation.error === 'RESERVED' ? 'reserved' : 'invalid',
        validationError: validation.error,
      };
    }

    // Check if already taken
    const existing = await this.slugRepo.findOne({
      where: { slug: normalized },
    });

    if (existing) {
      return {
        available: false,
        reason: 'duplicate',
      };
    }

    return { available: true };
  }

  /**
   * Reserve a slug for a store
   *
   * @throws Error if slug is not available
   */
  async reserveSlug(options: ReserveSlugOptions): Promise<PlatformStoreSlug> {
    const { storeId, serviceKey, slug } = options;
    const normalized = normalizeSlug(slug);

    // Check availability
    const availability = await this.checkAvailability(normalized);
    if (!availability.available) {
      throw new Error(
        `Slug '${slug}' is not available: ${availability.reason}`
      );
    }

    // Create slug record
    const slugRecord = this.slugRepo.create({
      slug: normalized,
      storeId,
      serviceKey,
      isActive: true,
    });

    return this.slugRepo.save(slugRecord);
  }

  /**
   * Generate a unique slug from a base name
   *
   * If the base slug is taken, appends -1, -2, etc.
   */
  async generateUniqueSlug(baseName: string): Promise<string> {
    const baseSlug = generateSlugFromName(baseName);

    // Try base slug first
    const baseAvailability = await this.checkAvailability(baseSlug);
    if (baseAvailability.available) {
      return baseSlug;
    }

    // Try with numeric suffixes
    for (let i = 1; i <= 100; i++) {
      const candidate = `${baseSlug}-${i}`;
      const availability = await this.checkAvailability(candidate);
      if (availability.available) {
        return candidate;
      }
    }

    throw new Error(
      `Unable to generate unique slug for: ${baseName} (tried 100 suffixes)`
    );
  }

  /**
   * Change a store's slug
   *
   * Enforces 1-time change policy.
   *
   * @throws Error if store has already changed slug or new slug is not available
   */
  async changeSlug(options: ChangeSlugOptions): Promise<PlatformStoreSlug> {
    const { storeId, serviceKey, newSlug, changedBy } = options;
    const normalized = normalizeSlug(newSlug);

    // Check if store has already changed slug
    const existingHistory = await this.historyRepo.findOne({
      where: { storeId },
    });

    if (existingHistory) {
      throw new Error(
        'Slug can only be changed once. This store has already changed its slug.'
      );
    }

    // Get current slug
    const currentSlugRecord = await this.slugRepo.findOne({
      where: { storeId, serviceKey },
    });

    if (!currentSlugRecord) {
      throw new Error(`No slug found for store: ${storeId}`);
    }

    // Check new slug availability
    const availability = await this.checkAvailability(normalized);
    if (!availability.available) {
      throw new Error(
        `Slug '${newSlug}' is not available: ${availability.reason}`
      );
    }

    // Record history
    const history = this.historyRepo.create({
      storeId,
      serviceKey,
      oldSlug: currentSlugRecord.slug,
      newSlug: normalized,
      changedBy,
    });
    await this.historyRepo.save(history);

    // Update slug
    currentSlugRecord.slug = normalized;
    return this.slugRepo.save(currentSlugRecord);
  }

  /**
   * Get slug history for a store
   */
  async getSlugHistory(storeId: string): Promise<PlatformStoreSlugHistory[]> {
    return this.historyRepo.find({
      where: { storeId },
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * Find a slug record by slug value
   */
  async findBySlug(slug: string): Promise<PlatformStoreSlug | null> {
    return this.slugRepo.findOne({
      where: { slug: normalizeSlug(slug) },
    });
  }

  /**
   * Find a slug record by store ID
   */
  async findByStoreId(
    storeId: string,
    serviceKey: StoreSlugServiceKey
  ): Promise<PlatformStoreSlug | null> {
    return this.slugRepo.findOne({
      where: { storeId, serviceKey },
    });
  }

  /**
   * Find old slug in history for redirect support
   */
  async findOldSlugRedirect(
    oldSlug: string
  ): Promise<{ newSlug: string; serviceKey: string } | null> {
    const history = await this.historyRepo.findOne({
      where: { oldSlug: normalizeSlug(oldSlug) },
      order: { changedAt: 'DESC' },
    });

    if (!history) {
      return null;
    }

    // Get current slug for this store
    const currentSlug = await this.slugRepo.findOne({
      where: { storeId: history.storeId },
    });

    if (!currentSlug) {
      return null;
    }

    return {
      newSlug: currentSlug.slug,
      serviceKey: currentSlug.serviceKey,
    };
  }

  /**
   * Deactivate a slug (soft delete)
   */
  async deactivateSlug(storeId: string, serviceKey: StoreSlugServiceKey): Promise<void> {
    await this.slugRepo.update(
      { storeId, serviceKey },
      { isActive: false }
    );
  }

  /**
   * Reactivate a slug
   */
  async reactivateSlug(storeId: string, serviceKey: StoreSlugServiceKey): Promise<void> {
    await this.slugRepo.update(
      { storeId, serviceKey },
      { isActive: true }
    );
  }

  /**
   * Check if a store can change its slug (has not changed before)
   */
  async canChangeSlug(storeId: string): Promise<boolean> {
    const history = await this.historyRepo.findOne({
      where: { storeId },
    });
    return !history;
  }
}
