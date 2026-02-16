/**
 * Base Resolver
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Abstract base class for content resolvers.
 * Provides common structure for CMS / Signage / LMS resolution.
 *
 * Each service extends this and implements resolveByType().
 */

import type { DataSource } from 'typeorm';
import type { ContentResolver, ResolvedContent } from '../interfaces/content-resolver.interface.js';

/**
 * Base resolver with DataSource injection and type dispatch.
 *
 * @example
 * class KpaResolver extends BaseResolver {
 *   protected async resolveByType(id: string, type: string) {
 *     if (type === 'cms') return this.resolveCms(id);
 *     if (type === 'signage') return this.resolveSignage(id);
 *     return null;
 *   }
 * }
 */
export abstract class BaseResolver implements ContentResolver {
  constructor(protected dataSource: DataSource) {}

  async resolve(sourceAssetId: string, assetType: string): Promise<ResolvedContent | null> {
    return this.resolveByType(sourceAssetId, assetType);
  }

  /**
   * Service-specific resolution logic.
   * Return null if the source asset is not found.
   */
  protected abstract resolveByType(
    sourceAssetId: string,
    assetType: string,
  ): Promise<ResolvedContent | null>;
}
