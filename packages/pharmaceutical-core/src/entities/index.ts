/**
 * Pharmaceutical Core Entities
 *
 * @package @o4o/pharmaceutical-core
 */

export * from './PharmaProductMaster.entity.js';
export * from './PharmaOffer.entity.js';
export * from './PharmaOrder.entity.js';
export * from './PharmaDispatch.entity.js';
export * from './PharmaSettlementBatch.entity.js';

// Entity list for TypeORM registration
import { PharmaProductMaster } from './PharmaProductMaster.entity.js';
import { PharmaOffer } from './PharmaOffer.entity.js';
import { PharmaOrder } from './PharmaOrder.entity.js';
import { PharmaDispatch } from './PharmaDispatch.entity.js';
import { PharmaSettlementBatch } from './PharmaSettlementBatch.entity.js';

export const pharmaEntities = [
  PharmaProductMaster,
  PharmaOffer,
  PharmaOrder,
  PharmaDispatch,
  PharmaSettlementBatch,
];
