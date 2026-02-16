/**
 * Asset Resolver Interface
 *
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 Phase 1
 *
 * Each service implements its own resolver to convert
 * service-specific assets into a standard ResolvedAsset.
 * The SnapshotService never knows the source structure.
 */

/**
 * Standard resolved asset — service-agnostic snapshot payload
 */
export interface ResolvedAsset {
  title: string;
  type: 'cms' | 'signage';
  contentJson: Record<string, unknown>;
  sourceService: string;
}

/**
 * Asset Resolver — implemented per service
 *
 * Core calls resolver.resolve() to get a standard payload,
 * then stores it in o4o_asset_snapshots.
 */
export interface AssetResolver {
  resolve(sourceAssetId: string, assetType: 'cms' | 'signage'): Promise<ResolvedAsset | null>;
}
