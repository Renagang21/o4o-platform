/**
 * Cosmetics Partner Extension Services
 */

export { PartnerProfileService } from './partner-profile.service';
export type { CreatePartnerProfileDto, UpdatePartnerProfileDto } from './partner-profile.service';

export { PartnerLinkService } from './partner-link.service';
export type { CreatePartnerLinkDto, UpdatePartnerLinkDto, LinkFilter } from './partner-link.service';

export { PartnerRoutineService } from './partner-routine.service';
export type {
  CreatePartnerRoutineDto,
  UpdatePartnerRoutineDto,
  RoutineFilter,
} from './partner-routine.service';

export { PartnerEarningsService } from './partner-earnings.service';
export type {
  CreatePartnerEarningsDto,
  UpdatePartnerEarningsDto,
  RecordCommissionDto,
  EarningsFilter,
  EarningsSummary,
  WithdrawalResult,
} from './partner-earnings.service';

// Commission System (Phase 6-D)
export { CommissionEngineService } from './commission-engine.service';
export type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  PolicyResolutionContext,
} from './commission-engine.service';

export { CommissionPolicyService } from './commission-policy.service';
export type {
  CreateCommissionPolicyDto,
  UpdateCommissionPolicyDto,
  PolicyFilter,
  PaginatedResult,
} from './commission-policy.service';
