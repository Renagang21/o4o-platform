/**
 * AssetSnapshot Service — Re-export from @o4o/asset-copy-core
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * This file preserves backward compatibility for existing imports.
 * All logic now lives in @o4o/asset-copy-core.
 */

export {
  AssetCopyService as AssetSnapshotService,
  type CopyAssetInput,
  type CopyResolvedInput as CopyResolvedAssetInput,
  type CopyResult as CopyAssetResult,
  type ListOptions,
  type PaginatedResult,
} from '@o4o/asset-copy-core';
