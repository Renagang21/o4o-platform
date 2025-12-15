/**
 * Cosmetics Partner Extension Entities
 */

export { PartnerProfile } from './partner-profile.entity.js';
export type { PartnerType, PartnerStatus, SocialLinks } from './partner-profile.entity.js';

export { PartnerLink } from './partner-link.entity.js';
export type { LinkType } from './partner-link.entity.js';

export { PartnerRoutine } from './partner-routine.entity.js';
export type { RoutineType, RoutineStep } from './partner-routine.entity.js';

export { PartnerEarnings } from './partner-earnings.entity.js';
export type { EarningsType, EarningsStatus, EventType } from './partner-earnings.entity.js';

export { CommissionPolicy } from './commission-policy.entity.js';
export type { PolicyType, PolicyMetadata } from './commission-policy.entity.js';

// All entities for module registration
export const CosmeticsPartnerEntities = [
  'PartnerProfile',
  'PartnerLink',
  'PartnerRoutine',
  'PartnerEarnings',
  'CommissionPolicy',
];

// ModuleLoader compatibility - export actual entity classes as 'entities' array
import { PartnerProfile } from './partner-profile.entity.js';
import { PartnerLink } from './partner-link.entity.js';
import { PartnerRoutine } from './partner-routine.entity.js';
import { PartnerEarnings } from './partner-earnings.entity.js';
import { CommissionPolicy } from './commission-policy.entity.js';

export const entities = [
  PartnerProfile,
  PartnerLink,
  PartnerRoutine,
  PartnerEarnings,
  CommissionPolicy,
];
