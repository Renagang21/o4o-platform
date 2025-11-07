/**
 * DEPRECATED: Use @o4o/types/partner instead
 *
 * This file provides backward compatibility aliases.
 * All affiliate types have been migrated to partner types.
 *
 * Migration path:
 * - AffiliateUser → PartnerUser
 * - AffiliateCommission → PartnerCommission
 * - AffiliateStats → PartnerStats
 *
 * @deprecated since v0.6.0 - Use partner types instead
 */

// Re-export all partner types with affiliate aliases
export type {
  PartnerUser,
  BankAccount,
  ReferralRelationship,
  ReferralClick,
  PartnerCommission,
  CommissionPolicy,
  PartnerStats,
  CreatePartnerRequest,
  CreatePartnerResponse,
  GetPartnerStatsRequest,
  ProcessCommissionRequest,
  GenerateReferralLinkRequest,
  GenerateReferralLinkResponse,
  AdminPartnerOverview,
  UserPartnerDashboard,
} from './partner.js';

import type {
  PartnerUser,
  PartnerCommission,
  PartnerStats,
  CreatePartnerRequest,
  CreatePartnerResponse,
  GetPartnerStatsRequest,
  AdminPartnerOverview,
  UserPartnerDashboard,
} from './partner.js';

// Backward compatibility aliases
/** @deprecated Use PartnerUser instead */
export type AffiliateUser = PartnerUser;

/** @deprecated Use PartnerCommission instead */
export type AffiliateCommission = PartnerCommission;

/** @deprecated Use PartnerStats instead */
export type AffiliateStats = PartnerStats;

/** @deprecated Use CreatePartnerRequest instead */
export type CreateAffiliateRequest = CreatePartnerRequest;

/** @deprecated Use CreatePartnerResponse instead */
export type CreateAffiliateResponse = CreatePartnerResponse;

/** @deprecated Use GetPartnerStatsRequest instead */
export type GetAffiliateStatsRequest = GetPartnerStatsRequest;

/** @deprecated Use AdminPartnerOverview instead */
export type AdminAffiliateOverview = AdminPartnerOverview;

/** @deprecated Use UserPartnerDashboard instead */
export type UserAffiliateDashboard = UserPartnerDashboard;
