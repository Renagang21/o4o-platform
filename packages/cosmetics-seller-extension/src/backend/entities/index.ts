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

// ModuleLoader compatibility - export actual entity classes as 'entities' array
import { SellerDisplay } from './seller-display.entity';
import { SellerSample } from './seller-sample.entity';
import { SellerInventory } from './seller-inventory.entity';
import { SellerConsultationLog } from './seller-consultation-log.entity';
import { SellerKPI } from './seller-kpi.entity';

export const entities = [
  SellerDisplay,
  SellerSample,
  SellerInventory,
  SellerConsultationLog,
  SellerKPI,
];
