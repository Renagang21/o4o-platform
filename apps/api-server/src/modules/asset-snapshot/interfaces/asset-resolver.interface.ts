/**
 * Asset Resolver Interface — Re-export from @o4o/asset-copy-core
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Backward compatibility: existing imports continue to work.
 * ContentResolver = AssetResolver (renamed for clarity in Core)
 * ResolvedContent = ResolvedAsset (renamed for clarity in Core)
 */

export type {
  ContentResolver as AssetResolver,
  ResolvedContent as ResolvedAsset,
} from '@o4o/asset-copy-core';
