/**
 * Pharmacy Extension - Entities Export
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * All entities for the Pharmacy Extension
 * Schema: signage_pharmacy
 */

export { PharmacyCategory } from './PharmacyCategory.entity.js';
export {
  PharmacySeasonalCampaign,
  type PharmacySeasonType,
  type PharmacyContentScope,
} from './PharmacySeasonalCampaign.entity.js';
export {
  PharmacyTemplatePreset,
  type PharmacyTemplateType,
  type PharmacyTemplateConfig,
} from './PharmacyTemplatePreset.entity.js';
export {
  PharmacyContent,
  type PharmacyContentType,
  type PharmacyContentSource,
  type PharmacyContentStatus,
  type PharmacyMediaData,
} from './PharmacyContent.entity.js';

/**
 * All Pharmacy entities for DataSource registration
 */
export const PharmacyEntities = [
  // Will be dynamically imported to avoid circular dependency
  // Use string-based entity names for TypeORM
];
