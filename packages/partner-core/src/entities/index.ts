/**
 * Partner Core Entities
 *
 * @package @o4o/partner-core
 */

export * from './Partner.entity.js';
export * from './PartnerLink.entity.js';
export * from './PartnerClick.entity.js';
export * from './PartnerConversion.entity.js';
export * from './PartnerCommission.entity.js';
export * from './PartnerSettlementBatch.entity.js';

// Entity list for TypeORM registration
import { Partner } from './Partner.entity.js';
import { PartnerLink } from './PartnerLink.entity.js';
import { PartnerClick } from './PartnerClick.entity.js';
import { PartnerConversion } from './PartnerConversion.entity.js';
import { PartnerCommission } from './PartnerCommission.entity.js';
import { PartnerSettlementBatch } from './PartnerSettlementBatch.entity.js';

export const partnerEntities = [
  Partner,
  PartnerLink,
  PartnerClick,
  PartnerConversion,
  PartnerCommission,
  PartnerSettlementBatch,
];
