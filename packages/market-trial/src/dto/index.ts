/**
 * Market Trial DTOs
 *
 * Phase 1 API: Request/Response DTOs for Market Trial endpoints.
 * Minimal validation, required fields only.
 */

import { ParticipantType } from '../entities/index.js';

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
