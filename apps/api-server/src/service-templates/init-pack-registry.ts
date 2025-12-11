/**
 * Init Pack Registry
 * Phase 8 — Service Environment Initialization
 *
 * Manages loading and retrieval of service initialization packs.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import type {
  ServiceInitPack,
  InitPackRegistryEntry,
} from './init-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Init Pack Registry Class
 *
 * Manages loading and retrieval of initialization packs
 */
export class InitPackRegistry {
  private initPacks = new Map<string, InitPackRegistryEntry>();
  private initPacksDir: string;

  constructor(initPacksDir?: string) {
    this.initPacksDir = initPacksDir || path.join(__dirname, 'init-packs');
  }

  /**
   * Load all init packs from the init-packs directory
   */
  async loadAll(): Promise<void> {
    if (!existsSync(this.initPacksDir)) {
      logger.warn(`[InitPackRegistry] Init packs directory not found: ${this.initPacksDir}`);
      return;
    }

    const files = readdirSync(this.initPacksDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.initPacksDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const initPack: ServiceInitPack = JSON.parse(content);

        if (this.validateInitPack(initPack)) {
          this.initPacks.set(initPack.id, {
            initPack,
            loadedAt: new Date(),
          });
          logger.info(`[InitPackRegistry] Loaded init pack: ${initPack.id}`);
        } else {
          logger.warn(`[InitPackRegistry] Invalid init pack in ${file}`);
        }
      } catch (error) {
        logger.error(`[InitPackRegistry] Failed to load ${file}:`, error);
      }
    }

    logger.info(`[InitPackRegistry] Loaded ${this.initPacks.size} init packs`);
  }

  /**
   * Validate an init pack structure
   */
  private validateInitPack(initPack: ServiceInitPack): boolean {
    if (!initPack.id || typeof initPack.id !== 'string') return false;
    if (!initPack.name || typeof initPack.name !== 'string') return false;
    if (!initPack.serviceGroup) return false;
    if (!initPack.version) return false;
    return true;
  }

  /**
   * Get an init pack by ID
   */
  getInitPack(id: string): ServiceInitPack | undefined {
    return this.initPacks.get(id)?.initPack;
  }

  /**
   * Get init pack for a template ID
   * Convention: template ID + '-init' = init pack ID
   */
  getInitPackForTemplate(templateId: string): ServiceInitPack | undefined {
    // Try exact match first
    const exactMatch = this.initPacks.get(`${templateId}-init`)?.initPack;
    if (exactMatch) return exactMatch;

    // Try without suffix
    const directMatch = this.initPacks.get(templateId)?.initPack;
    if (directMatch) return directMatch;

    return undefined;
  }

  /**
   * Get all init packs
   */
  getAllInitPacks(): ServiceInitPack[] {
    return Array.from(this.initPacks.values()).map(e => e.initPack);
  }

  /**
   * Get init packs by service group
   */
  getInitPacksByServiceGroup(serviceGroup: ServiceGroup): ServiceInitPack[] {
    return this.getAllInitPacks().filter(p => p.serviceGroup === serviceGroup);
  }

  /**
   * Check if init pack exists
   */
  hasInitPack(id: string): boolean {
    return this.initPacks.has(id);
  }

  /**
   * Register an init pack programmatically
   */
  registerInitPack(initPack: ServiceInitPack): boolean {
    if (!this.validateInitPack(initPack)) {
      logger.warn(`[InitPackRegistry] Invalid init pack: ${initPack.id}`);
      return false;
    }

    this.initPacks.set(initPack.id, {
      initPack,
      loadedAt: new Date(),
    });

    logger.info(`[InitPackRegistry] Registered init pack: ${initPack.id}`);
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byServiceGroup: Record<string, number>;
  } {
    const initPacks = this.getAllInitPacks();
    const byServiceGroup: Record<string, number> = {};

    for (const pack of initPacks) {
      byServiceGroup[pack.serviceGroup] = (byServiceGroup[pack.serviceGroup] || 0) + 1;
    }

    return {
      total: initPacks.length,
      byServiceGroup,
    };
  }

  /**
   * Clear all init packs (for testing)
   */
  clear(): void {
    this.initPacks.clear();
    logger.info('[InitPackRegistry] Cleared all init packs');
  }
}

/**
 * Singleton instance
 */
export const initPackRegistry = new InitPackRegistry();

export default initPackRegistry;
