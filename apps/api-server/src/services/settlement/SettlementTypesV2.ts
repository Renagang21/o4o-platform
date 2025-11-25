/**
 * SettlementEngine v2 Type Definitions
 * P2-C Phase C-1: Type/Interface Skeleton
 *
 * Purpose:
 * - Defines types and interfaces for SettlementEngine v2
 * - Supports policy-based, versioned settlement rules
 * - Enables shadow/parallel execution with v1
 *
 * Design Reference:
 * - docs/dev/R-8-8-1-SettlementEngine-v2-Design.md
 * - docs/dev/P2-C-SettlementEngine-v2-Implementation-Guide.md
 *
 * Created: 2025-11-25 (P2-C Phase C-1)
 */

import { Settlement } from '../../entities/Settlement.js';
import { SettlementItem } from '../../entities/SettlementItem.js';
import { Commission } from '../../entities/Commission.js';

/**
 * Party types for v2 settlement system
 * Extends v1 to support future party types
 */
export type SettlementPartyTypeV2 =
  | 'seller'
  | 'supplier'
  | 'partner'
  | 'platform';

/**
 * Settlement party context
 * Contains all metadata needed for party-specific settlement rules
 */
export interface SettlementPartyContext {
  partyType: SettlementPartyTypeV2;
  partyId: string;

  // Financial settings
  currency: string;            // 'KRW', 'USD', etc.
  taxRate?: number;            // Tax rate (e.g., 10 for 10%)
  minPayoutAmount?: number;    // Minimum settlement amount
  holdPeriodDays?: number;     // Hold period in days

  // Extension point for party-specific config
  customConfig?: Record<string, unknown>;
}

/**
 * Commission tier definition
 * Phase C-4: Defines a single tier in tiered commission structure
 */
export interface CommissionTier {
  minAmount: number;      // Minimum amount (inclusive)
  maxAmount?: number;     // Maximum amount (exclusive), undefined = no upper bound
  percentageRate: number; // Commission rate for this tier (e.g., 5 for 5%)
}

/**
 * Commission rule definition
 * Defines how commission is calculated for specific conditions
 * Phase C-4: Added tiered commission support
 */
export interface CommissionRule {
  id: string;
  name: string;
  description?: string;

  // Applicability conditions
  appliesTo: {
    partyType?: SettlementPartyTypeV2;
    productIds?: string[];
    categoryIds?: string[];
    channelIds?: string[];
  };

  // Calculation type and parameters
  type: 'percentage' | 'fixed' | 'tiered';

  // For percentage type
  percentageRate?: number;    // e.g., 5 for 5%

  // For fixed type
  fixedAmount?: number;       // e.g., 1000 for ₩1,000

  // For tiered type (Phase C-4)
  tiers?: CommissionTier[];   // Array of tiers, applied based on gross amount
}

/**
 * Commission rule set
 * Groups multiple rules with versioning and validity period
 */
export interface CommissionRuleSet {
  id: string;
  name: string;
  description?: string;
  rules: CommissionRule[];

  // Versioning
  version?: string;

  // Validity period
  validFrom?: Date;
  validTo?: Date;
}

/**
 * SettlementEngine v2 configuration
 * Complete configuration for running v2 settlement engine
 * Phase C-4: Added duplicate prevention and comparison options
 */
export interface SettlementV2Config {
  // Settlement period
  periodStart: Date;
  periodEnd: Date;

  // Target parties
  parties: SettlementPartyContext[];

  // Rule set to apply
  ruleSet: CommissionRuleSet;

  // Execution options
  dryRun?: boolean;                 // If true, don't persist to DB
  logLevel?: 'none' | 'summary' | 'verbose';
  tag?: string;                     // Execution tag (e.g., 'v2-shadow-run-2025Q1')

  // Phase C-4: Duplicate prevention
  preventDuplicates?: boolean;      // If true, throw error if v1/v2 settlements already exist

  // Phase C-4: Shadow-run comparison
  compareWithV1?: boolean;          // If true, include v1 vs v2 diff in diagnostics
}

/**
 * Settlement difference summary for v1 vs v2 comparison
 * Phase C-4: Shadow-run comparison result
 */
export interface SettlementDiffSummary {
  partyKey: string;         // 'seller:123', 'partner:456', etc.
  v1Amount: string;         // v1 settlement payable amount
  v2Amount: string;         // v2 settlement payable amount
  difference: string;       // v2 - v1
  diffPercentage: number;   // (v2 - v1) / v1 * 100
}

/**
 * Duplicate settlement information
 * Phase C-4: Duplicate detection result
 */
export interface DuplicateSettlementInfo {
  partyKey: string;
  settlementId: string;
  periodStart: Date;
  periodEnd: Date;
  engineVersion: string;    // 'v1' or 'v2' or unknown
}

/**
 * SettlementEngine v2 execution result
 * Contains generated settlements and diagnostic information
 * Phase C-4: Enhanced diagnostics with duplicates, tiers, and v1 comparison
 */
export interface SettlementEngineV2Result {
  // Generated entities (not yet persisted if dryRun=true)
  settlements: Settlement[];
  settlementItems: SettlementItem[];
  commissions?: Commission[];

  // Diagnostic information
  diagnostics?: {
    // How many times each rule was applied
    ruleHits: Record<string, number>;

    // Total amounts by party
    totalsByParty: Record<string, string>; // partyKey -> amount as string

    // Phase C-4: Duplicate detection
    duplicatesDetected: boolean;
    duplicates?: DuplicateSettlementInfo[];

    // Phase C-4: Tiered rules application tracking
    tiersApplied?: Record<string, number>; // ruleId -> count

    // Phase C-4: v1 vs v2 comparison (optional, if compareWithV1=true)
    v1vsV2Diff?: SettlementDiffSummary[];
  };
}
