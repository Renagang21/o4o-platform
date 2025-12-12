/**
 * Pharmaceutical Core
 *
 * 의약품 B2B 유통 Core App
 *
 * 독립적인 의약품 유통 워크플로우를 제공하며,
 * Dropshipping Core와 연동하여 productType='pharmaceutical'에 대한
 * 검증 Hook을 제공합니다.
 *
 * @package @o4o/pharmaceutical-core
 */

// Manifest
export { pharmaceuticalCoreManifest } from './manifest.js';

// Entities
export { pharmaEntities } from './entities/index.js';
export {
  PharmaProductMaster,
  PharmaProductCategory,
  PharmaProductStatus,
} from './entities/PharmaProductMaster.entity.js';
export {
  PharmaOffer,
  PharmaOfferStatus,
  PharmaSupplierType,
} from './entities/PharmaOffer.entity.js';
export {
  PharmaOrder,
  PharmaOrderStatus,
  PharmaPaymentStatus,
} from './entities/PharmaOrder.entity.js';
export {
  PharmaSettlementBatch,
  PharmaSettlementStatus,
  PharmaSettlementType,
} from './entities/PharmaSettlementBatch.entity.js';

// Services
export {
  PharmaProductService,
  type CreatePharmaProductDto,
  type UpdatePharmaProductDto,
  type PharmaProductFilter,
} from './services/PharmaProductService.js';
export {
  PharmaOfferService,
  type CreatePharmaOfferDto,
  type UpdatePharmaOfferDto,
  type PharmaOfferFilter,
} from './services/PharmaOfferService.js';
export {
  PharmaOrderService,
  type CreatePharmaOrderDto,
  type UpdatePharmaOrderDto,
  type PharmaOrderFilter,
} from './services/PharmaOrderService.js';
export {
  PharmaSettlementService,
  type CreateSettlementBatchDto,
  type SettlementBatchFilter,
} from './services/PharmaSettlementService.js';

// Lifecycle Hooks
export {
  onInstall,
  onActivate,
  onDeactivate,
  onUninstall,
} from './lifecycle/index.js';

// Extension
export { pharmaceuticalExtension } from './hooks/pharmaceutical-extension.js';
