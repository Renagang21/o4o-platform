/**
 * MarketTrialDecisionService
 *
 * Phase 2: Decision (의사 표현) service.
 *
 * Responsibilities:
 * - Submit seller/partner decisions
 * - Check for duplicate decisions
 * - Record decision only (판매 전환은 별도 수동 등록)
 *
 * WO-MARKET-TRIAL-DECOUPLE-DROPSHIPPING-V1:
 * SellerListing 자동 생성 로직 제거. Market Trial은 "검증 도메인"으로 한정.
 */

import { DataSource, Repository } from 'typeorm';
import {
  MarketTrialDecision,
  DecisionType,
  MarketTrial,
  TrialStatus,
  MarketTrialParticipant,
  ParticipantType,
} from '../entities/index.js';

export interface SellerDecisionDto {
  participantId: string;
  decision: DecisionType;
}

export interface PartnerDecisionDto {
  participantId: string;
  decision: DecisionType;
  sellerIds?: string[]; // Required when decision = CONTINUE
}

export interface DecisionResult {
  decision: MarketTrialDecision;
  applicationsCreated: number;
  applicationIds: string[];
}

export class MarketTrialDecisionService {
  private decisionRepo: Repository<MarketTrialDecision>;
  private trialRepo: Repository<MarketTrial>;
  private participantRepo: Repository<MarketTrialParticipant>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.decisionRepo = dataSource.getRepository(MarketTrialDecision);
    this.trialRepo = dataSource.getRepository(MarketTrial);
    this.participantRepo = dataSource.getRepository(MarketTrialParticipant);
  }

  /**
   * Check if participant has already made a decision
   */
  async hasDecisionAlready(trialId: string, participantId: string): Promise<boolean> {
    const existing = await this.decisionRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
      },
    });
    return !!existing;
  }

  /**
   * Validate that trial is in correct status for decision
   */
  private async validateTrialStatus(trialId: string): Promise<MarketTrial> {
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });

    if (!trial) {
      throw new Error('Market Trial not found');
    }

    // Decisions can only be made when trial is in OUTCOME_CONFIRMING status
    if (trial.status !== TrialStatus.OUTCOME_CONFIRMING) {
      throw new Error('Decisions can only be made when trial is in outcome confirming phase');
    }

    return trial;
  }

  /**
   * Validate that participant exists in this trial
   */
  private async validateParticipant(
    trialId: string,
    participantId: string,
    expectedType: ParticipantType
  ): Promise<MarketTrialParticipant> {
    const participant = await this.participantRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
        participantType: expectedType,
      },
    });

    if (!participant) {
      throw new Error(`Participant not found or not a ${expectedType}`);
    }

    return participant;
  }

  /**
   * Submit seller decision
   */
  async submitSellerDecision(trialId: string, dto: SellerDecisionDto): Promise<DecisionResult> {
    // Validate trial status
    await this.validateTrialStatus(trialId);

    // Validate participant
    await this.validateParticipant(trialId, dto.participantId, ParticipantType.SELLER);

    // Check for duplicate decision
    if (await this.hasDecisionAlready(trialId, dto.participantId)) {
      throw new Error('Decision already submitted');
    }

    // Use transaction for atomicity
    return await this.dataSource.transaction(async (manager) => {
      const decisionRepo = manager.getRepository(MarketTrialDecision);

      // Create decision record
      const decision = decisionRepo.create({
        marketTrialId: trialId,
        participantId: dto.participantId,
        participantType: ParticipantType.SELLER,
        decision: dto.decision,
        selectedSellerIds: null,
      });

      const savedDecision = await decisionRepo.save(decision);

      // Decision 기록만 수행. 판매 전환은 별도 수동 등록으로 처리.
      return {
        decision: savedDecision,
        applicationsCreated: 0,
        applicationIds: [],
      };
    });
  }

  /**
   * Submit partner decision
   */
  async submitPartnerDecision(trialId: string, dto: PartnerDecisionDto): Promise<DecisionResult> {
    // Validate trial status
    await this.validateTrialStatus(trialId);

    // Validate participant
    await this.validateParticipant(trialId, dto.participantId, ParticipantType.PARTNER);

    // Check for duplicate decision
    if (await this.hasDecisionAlready(trialId, dto.participantId)) {
      throw new Error('Decision already submitted');
    }

    // For CONTINUE, sellerIds is required
    if (dto.decision === DecisionType.CONTINUE) {
      if (!dto.sellerIds || dto.sellerIds.length === 0) {
        throw new Error('sellerIds required when decision is CONTINUE');
      }
    }

    // Use transaction for atomicity
    return await this.dataSource.transaction(async (manager) => {
      const decisionRepo = manager.getRepository(MarketTrialDecision);

      // Create decision record
      const decision = decisionRepo.create({
        marketTrialId: trialId,
        participantId: dto.participantId,
        participantType: ParticipantType.PARTNER,
        decision: dto.decision,
        selectedSellerIds: dto.sellerIds ? JSON.stringify(dto.sellerIds) : null,
      });

      const savedDecision = await decisionRepo.save(decision);

      // Decision 기록만 수행. 판매 전환은 별도 수동 등록으로 처리.
      return {
        decision: savedDecision,
        applicationsCreated: 0,
        applicationIds: [],
      };
    });
  }

  /**
   * Get decision by trial and participant
   */
  async getDecision(trialId: string, participantId: string): Promise<MarketTrialDecision | null> {
    return await this.decisionRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
      },
    });
  }

  /**
   * Get all decisions for a trial
   */
  async getDecisionsByTrial(trialId: string): Promise<MarketTrialDecision[]> {
    return await this.decisionRepo.find({
      where: { marketTrialId: trialId },
      order: { createdAt: 'DESC' },
    });
  }
}
