/**
 * Cosmetics Partner Extension Entities
 */

export { PartnerProfile } from './partner-profile.entity';
export type { PartnerType, PartnerStatus, SocialLinks } from './partner-profile.entity';

export { PartnerLink } from './partner-link.entity';
export type { LinkType } from './partner-link.entity';

export { PartnerRoutine } from './partner-routine.entity';
export type { RoutineType, RoutineStep } from './partner-routine.entity';

export { PartnerEarnings } from './partner-earnings.entity';
export type { EarningsType, EarningsStatus, EventType } from './partner-earnings.entity';

export { CommissionPolicy } from './commission-policy.entity';
export type { PolicyType, PolicyMetadata } from './commission-policy.entity';

// All entities for module registration
export const CosmeticsPartnerEntities = [
  'PartnerProfile',
  'PartnerLink',
  'PartnerRoutine',
  'PartnerEarnings',
  'CommissionPolicy',
];

// ModuleLoader compatibility - export actual entity classes as 'entities' array
import { PartnerProfile } from './partner-profile.entity';
import { PartnerLink } from './partner-link.entity';
import { PartnerRoutine } from './partner-routine.entity';
import { PartnerEarnings } from './partner-earnings.entity';
import { CommissionPolicy } from './commission-policy.entity';

export const entities = [
  PartnerProfile,
  PartnerLink,
  PartnerRoutine,
  PartnerEarnings,
  CommissionPolicy,
];
