/**
 * Cosmetics Seller Extension Entities
 */

export { SellerDisplay } from './seller-display.entity.js';
export type { DisplayLocation, FacingQuality } from './seller-display.entity.js';

export { SellerSample } from './seller-sample.entity.js';
export type { SampleUsageType, SampleUsageLog } from './seller-sample.entity.js';

export { SellerInventory } from './seller-inventory.entity.js';
export type { AdjustmentReason, StockAdjustment } from './seller-inventory.entity.js';

export { SellerConsultationLog } from './seller-consultation-log.entity.js';
export type {
  ConsultationResultStatus,
  RecommendedProduct,
  PurchasedProduct,
} from './seller-consultation-log.entity.js';

export { SellerKPI } from './seller-kpi.entity.js';
export type { KPIPeriodType } from './seller-kpi.entity.js';

// All entities for module registration
export const CosmeticsSellerEntities = [
  'SellerDisplay',
  'SellerSample',
  'SellerInventory',
  'SellerConsultationLog',
  'SellerKPI',
];

// ModuleLoader compatibility - export actual entity classes as 'entities' array
import { SellerDisplay } from './seller-display.entity.js';
import { SellerSample } from './seller-sample.entity.js';
import { SellerInventory } from './seller-inventory.entity.js';
import { SellerConsultationLog } from './seller-consultation-log.entity.js';
import { SellerKPI } from './seller-kpi.entity.js';

export const entities = [
  SellerDisplay,
  SellerSample,
  SellerInventory,
  SellerConsultationLog,
  SellerKPI,
];
