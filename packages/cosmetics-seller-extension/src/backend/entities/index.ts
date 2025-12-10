/**
 * Cosmetics Seller Extension Entities
 */

export { SellerDisplay } from './seller-display.entity';
export type { DisplayLocation, FacingQuality } from './seller-display.entity';

export { SellerSample } from './seller-sample.entity';
export type { SampleUsageType, SampleUsageLog } from './seller-sample.entity';

export { SellerInventory } from './seller-inventory.entity';
export type { AdjustmentReason, StockAdjustment } from './seller-inventory.entity';

export { SellerConsultationLog } from './seller-consultation-log.entity';
export type {
  ConsultationResultStatus,
  RecommendedProduct,
  PurchasedProduct,
} from './seller-consultation-log.entity';

export { SellerKPI } from './seller-kpi.entity';
export type { KPIPeriodType } from './seller-kpi.entity';

// All entities for module registration
export const CosmeticsSellerEntities = [
  'SellerDisplay',
  'SellerSample',
  'SellerInventory',
  'SellerConsultationLog',
  'SellerKPI',
];
