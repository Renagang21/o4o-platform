/**
 * Cosmetics Extension - Entities Export
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * All entities for the Cosmetics Extension
 * Schema: signage_cosmetics
 */

export { CosmeticsBrand } from './CosmeticsBrand.entity.js';
export {
  CosmeticsContentPreset,
  type CosmeticsPresetType,
  type CosmeticsVisualConfig,
} from './CosmeticsContentPreset.entity.js';
export {
  CosmeticsBrandContent,
  type CosmeticsContentType,
  type CosmeticsContentStatus,
  type CosmeticsContentScope,
  type CosmeticsMediaAssets,
} from './CosmeticsBrandContent.entity.js';
export {
  CosmeticsTrendCard,
  type CosmeticsTrendType,
} from './CosmeticsTrendCard.entity.js';
