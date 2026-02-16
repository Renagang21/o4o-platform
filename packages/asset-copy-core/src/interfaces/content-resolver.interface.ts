/**
 * Content Resolver Interface
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Each service implements its own resolver to convert
 * service-specific assets into a standard ResolvedContent.
 * The AssetCopyService never knows the source structure.
 */

/**
 * Standard resolved content — service-agnostic snapshot payload
 */
export interface ResolvedContent {
  title: string;
  type: string;
  contentJson: Record<string, unknown>;
  sourceService: string;
}

/**
 * Content Resolver — implemented per service
 *
 * Core calls resolver.resolve() to get a standard payload,
 * then stores it in o4o_asset_snapshots.
 */
export interface ContentResolver {
  resolve(sourceAssetId: string, assetType: string): Promise<ResolvedContent | null>;
}
