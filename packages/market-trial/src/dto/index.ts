/**
 * Market Trial DTOs
 *
 * Phase 1 & 2 API: Request/Response DTOs for Market Trial endpoints.
 * Minimal validation, required fields only.
 */

import { ParticipantType, DecisionType } from '../entities/index.js';

/**
 * Create Market Trial Request
 */
export interface CreateMarketTrialRequest {
  productId: string;
  title: string;
  description?: string;
  trialUnitPrice: number;
  targetAmount: number;
  fundingStartAt: string; // ISO date string
  fundingEndAt: string;   // ISO date string
  trialPeriodDays: number;
}

/**
 * Participate in Market Trial Request
 */
export interface ParticipateRequest {
  contributionAmount: number;
}

/**
 * Market Trial Response
 */
export interface MarketTrialResponse {
  id: string;
  supplierId: string;
  productId: string;
  title: string;
  description: string | null;
  trialUnitPrice: number;
  targetAmount: number;
  currentAmount: number;
  fundingStartAt: string;
  fundingEndAt: string;
  trialPeriodDays: number;
  status: string;
  forumId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Participation Response
 */
export interface ParticipationResponse {
  id: string;
  marketTrialId: string;
  participantId: string;
  participantType: string;
  contributionAmount: number;
  createdAt: string;
}

/**
 * List Trials Query Parameters
 */
export interface ListTrialsQuery {
  status?: string;
  supplierId?: string;
}

/**
 * Validate Create Market Trial Request
 */
export function validateCreateRequest(data: any): CreateMarketTrialRequest {
  if (!data.productId) throw new Error('productId is required');
  if (!data.title) throw new Error('title is required');
  if (data.trialUnitPrice === undefined || data.trialUnitPrice <= 0) {
    throw new Error('trialUnitPrice must be positive');
  }
  if (data.targetAmount === undefined || data.targetAmount <= 0) {
    throw new Error('targetAmount must be positive');
  }
  if (!data.fundingStartAt) throw new Error('fundingStartAt is required');
  if (!data.fundingEndAt) throw new Error('fundingEndAt is required');
  if (!data.trialPeriodDays || data.trialPeriodDays <= 0) {
    throw new Error('trialPeriodDays must be positive');
  }

  return {
    productId: data.productId,
    title: data.title,
    description: data.description,
    trialUnitPrice: Number(data.trialUnitPrice),
    targetAmount: Number(data.targetAmount),
    fundingStartAt: data.fundingStartAt,
    fundingEndAt: data.fundingEndAt,
    trialPeriodDays: Number(data.trialPeriodDays),
  };
}

/**
 * Validate Participate Request
 */
export function validateParticipateRequest(data: any): ParticipateRequest {
  if (data.contributionAmount === undefined || data.contributionAmount <= 0) {
    throw new Error('contributionAmount must be positive');
  }

  return {
    contributionAmount: Number(data.contributionAmount),
  };
}

// =====================================================
// Phase 2: Decision (의사 표현) DTOs
// =====================================================

/**
 * Seller Decision Request
 */
export interface SellerDecisionRequest {
  decision: string; // 'continue' | 'stop'
}

/**
 * Partner Decision Request
 */
export interface PartnerDecisionRequest {
  decision: string; // 'continue' | 'stop'
  sellerIds?: string[]; // Required when decision = 'continue'
}

/**
 * Decision Response
 */
export interface DecisionResponse {
  id: string;
  marketTrialId: string;
  participantId: string;
  participantType: string;
  decision: string;
  selectedSellerIds: string[] | null;
  createdAt: string;
}

/**
 * Submit Decision Result Response
 */
export interface DecisionResultResponse {
  decision: DecisionResponse;
  applicationsCreated: number;
  applicationIds: string[];
}

/**
 * Validate Seller Decision Request
 */
export function validateSellerDecisionRequest(data: any): SellerDecisionRequest {
  if (!data.decision) {
    throw new Error('decision is required');
  }

  const validDecisions = [DecisionType.CONTINUE, DecisionType.STOP];
  if (!validDecisions.includes(data.decision as DecisionType)) {
    throw new Error('decision must be "continue" or "stop"');
  }

  return {
    decision: data.decision,
  };
}

/**
 * Validate Partner Decision Request
 */
export function validatePartnerDecisionRequest(data: any): PartnerDecisionRequest {
  if (!data.decision) {
    throw new Error('decision is required');
  }

  const validDecisions = [DecisionType.CONTINUE, DecisionType.STOP];
  if (!validDecisions.includes(data.decision as DecisionType)) {
    throw new Error('decision must be "continue" or "stop"');
  }

  // sellerIds is required when decision = CONTINUE
  if (data.decision === DecisionType.CONTINUE) {
    if (!data.sellerIds || !Array.isArray(data.sellerIds) || data.sellerIds.length === 0) {
      throw new Error('sellerIds is required when decision is "continue"');
    }
  }

  return {
    decision: data.decision,
    sellerIds: data.sellerIds,
  };
}
