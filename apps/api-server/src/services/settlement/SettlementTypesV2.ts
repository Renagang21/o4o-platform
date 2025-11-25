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
 * Commission rule definition
 * Defines how commission is calculated for specific conditions
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

  // For tiered type (future extension)
  // tieredRates?: Array<{ minAmount: number; maxAmount: number; rate: number }>;
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
}

/**
 * SettlementEngine v2 execution result
 * Contains generated settlements and diagnostic information
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
  };
}
