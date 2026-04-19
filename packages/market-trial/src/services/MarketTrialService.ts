/**
 * MarketTrialService
 *
 * Phase 1 API: Core service for Market Trial operations.
 *
 * Responsibilities:
 * - Create trials
 * - List/Get trials
 * - Handle participation
 * - Evaluate funding status
 */

import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  TrialStatus,
  MarketTrialParticipant,
  ParticipantType,
  MarketTrialForum,
} from '../entities/index.js';

export interface CreateTrialDto {
  supplierId: string;
  supplierName?: string;
  title: string;
  /** One-liner proposal — WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1 */
  oneLiner?: string;
  /** Representative video URL — WO-MARKET-TRIAL-VIDEO-FIELD-V1 */
  videoUrl?: string;
  description?: string;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  visibleServiceKeys?: string[];
  maxParticipants?: number;
  trialUnitPrice?: number;
  targetAmount?: number;
  /** Reward rate (%) — WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1 */
  rewardRate?: number;
  /** Rich HTML sales scenario — WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1 */
  salesScenarioContent?: string;
  fundingStartAt: Date;
  fundingEndAt: Date;
  trialPeriodDays: number;
}

/**
 * 크라우드 펀딩 정산 계산
 * WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
 *
 * @param contribution  참여자 기여금 (원)
 * @param rewardRate    리워드 비율 (%, e.g. 5 = 5%)
 * @param unitPrice     제품 단가 (원, 0이면 수량 계산 안 함)
 */
export function calculateSettlement(
  contribution: number,
  rewardRate: number,
  unitPrice: number,
): { totalAmount: number; productQty: number; remainder: number } {
  const totalAmount = contribution * (1 + rewardRate / 100);
  if (!unitPrice || unitPrice <= 0) {
    return { totalAmount, productQty: 0, remainder: totalAmount };
  }
  const productQty = Math.floor(totalAmount / unitPrice);
  const remainder = totalAmount - productQty * unitPrice;
  return { totalAmount, productQty, remainder };
}

/** WO-MARKET-TRIAL-EDIT-FLOW-V1 */
export interface UpdateTrialDto {
  title?: string;
  oneLiner?: string;
  videoUrl?: string;
  description?: string;
  salesScenarioContent?: string;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  visibleServiceKeys?: string[];
  maxParticipants?: number;
  trialUnitPrice?: number;
  targetAmount?: number;
  rewardRate?: number;
  fundingStartAt?: Date;
  fundingEndAt?: Date;
  trialPeriodDays?: number;
}

export interface ParticipateDto {
  participantId: string;
  participantType: ParticipantType;
  contributionAmount: number;
}

export interface ListTrialsFilter {
  status?: TrialStatus;
  supplierId?: string;
}

export class MarketTrialService {
  private trialRepo: Repository<MarketTrial>;
  private participantRepo: Repository<MarketTrialParticipant>;
  private forumRepo: Repository<MarketTrialForum>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.trialRepo = dataSource.getRepository(MarketTrial);
    this.participantRepo = dataSource.getRepository(MarketTrialParticipant);
    this.forumRepo = dataSource.getRepository(MarketTrialForum);
  }

  /**
   * Create a new Market Trial (status = DRAFT)
   * WO-O4O-MARKET-TRIAL-PHASE1-V1: DRAFT로 생성, 승인 후 RECRUITING 전환
   */
  async createTrial(dto: CreateTrialDto): Promise<MarketTrial> {
    const trial = this.trialRepo.create({
      supplierId: dto.supplierId,
      supplierName: dto.supplierName || undefined,
      title: dto.title,
      oneLiner: dto.oneLiner || null,
      videoUrl: dto.videoUrl || null,
      description: dto.description || null,
      salesScenarioContent: dto.salesScenarioContent || null,
      outcomeSnapshot: dto.outcomeSnapshot || undefined,
      visibleServiceKeys: dto.visibleServiceKeys || [],
      maxParticipants: dto.maxParticipants || undefined,
      trialUnitPrice: dto.trialUnitPrice || 0,
      targetAmount: dto.targetAmount || 0,
      rewardRate: dto.rewardRate ?? 0,
      currentAmount: 0,
      fundingStartAt: dto.fundingStartAt,
      fundingEndAt: dto.fundingEndAt,
      trialPeriodDays: dto.trialPeriodDays,
      status: TrialStatus.DRAFT,
    });

    return this.trialRepo.save(trial);
  }

  /**
   * Submit trial for operator review (DRAFT → SUBMITTED)
   */
  async submitTrial(trialId: string, supplierId: string): Promise<MarketTrial> {
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });
    if (!trial) {
      throw new Error('Market Trial not found');
    }
    if (trial.supplierId !== supplierId) {
      throw new Error('Not authorized to submit this trial');
    }
    if (trial.status !== TrialStatus.DRAFT) {
      throw new Error('Only DRAFT trials can be submitted');
    }
    trial.status = TrialStatus.SUBMITTED;
    return this.trialRepo.save(trial);
  }

  /**
   * Update a DRAFT trial (supplier only)
   * WO-MARKET-TRIAL-EDIT-FLOW-V1
   */
  async updateTrial(trialId: string, supplierId: string, dto: UpdateTrialDto): Promise<MarketTrial> {
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });
    if (!trial) throw new Error('Market Trial not found');
    if (trial.supplierId !== supplierId) throw new Error('Not authorized to edit this trial');
    if (trial.status !== TrialStatus.DRAFT) throw new Error('Only DRAFT trials can be edited');

    if (dto.title !== undefined) trial.title = dto.title;
    if (dto.oneLiner !== undefined) trial.oneLiner = dto.oneLiner || null;
    if (dto.videoUrl !== undefined) trial.videoUrl = dto.videoUrl || null;
    if (dto.description !== undefined) trial.description = dto.description || null;
    if (dto.salesScenarioContent !== undefined) trial.salesScenarioContent = dto.salesScenarioContent || null;
    if (dto.outcomeSnapshot !== undefined) trial.outcomeSnapshot = dto.outcomeSnapshot;
    if (dto.visibleServiceKeys !== undefined) trial.visibleServiceKeys = dto.visibleServiceKeys;
    if (dto.maxParticipants !== undefined) trial.maxParticipants = dto.maxParticipants;
    if (dto.trialUnitPrice !== undefined) trial.trialUnitPrice = dto.trialUnitPrice;
    if (dto.targetAmount !== undefined) trial.targetAmount = dto.targetAmount;
    if (dto.rewardRate !== undefined) trial.rewardRate = dto.rewardRate;
    if (dto.fundingStartAt !== undefined) trial.fundingStartAt = dto.fundingStartAt;
    if (dto.fundingEndAt !== undefined) trial.fundingEndAt = dto.fundingEndAt;
    if (dto.trialPeriodDays !== undefined) trial.trialPeriodDays = dto.trialPeriodDays;

    return this.trialRepo.save(trial);
  }

  /**
   * List Market Trials with optional filtering
   */
  async listTrials(filter?: ListTrialsFilter): Promise<MarketTrial[]> {
    const query = this.trialRepo.createQueryBuilder('trial');

    if (filter?.status) {
      query.andWhere('trial.status = :status', { status: filter.status });
    }

    if (filter?.supplierId) {
      query.andWhere('trial.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    query.orderBy('trial.createdAt', 'DESC');

    const trials = await query.getMany();

    // Evaluate status for each trial
    for (const trial of trials) {
      await this.evaluateStatusIfNeeded(trial);
    }

    return trials;
  }

  /**
   * Get a single Market Trial by ID
   */
  async getTrial(id: string): Promise<MarketTrial | null> {
    const trial = await this.trialRepo.findOne({ where: { id } });

    if (!trial) {
      return null;
    }

    // Evaluate and update status if needed
    await this.evaluateStatusIfNeeded(trial);

    return trial;
  }

  /**
   * Get trial with forum information
   */
  async getTrialWithForum(id: string): Promise<{ trial: MarketTrial; forumId: string | null } | null> {
    const trial = await this.getTrial(id);

    if (!trial) {
      return null;
    }

    const forumMapping = await this.forumRepo.findOne({
      where: { marketTrialId: id },
    });

    return {
      trial,
      forumId: forumMapping?.forumId || null,
    };
  }

  /**
   * Participate in a Market Trial
   */
  async participate(trialId: string, dto: ParticipateDto): Promise<MarketTrialParticipant> {
    // Get the trial
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });

    if (!trial) {
      throw new Error('Market Trial not found');
    }

    // Check if trial is open for participation
    if (trial.status !== TrialStatus.RECRUITING) {
      throw new Error('Market Trial is not open for participation');
    }

    // Check funding period
    const now = new Date();
    if (now < new Date(trial.fundingStartAt)) {
      throw new Error('Funding period has not started yet');
    }
    if (now > new Date(trial.fundingEndAt)) {
      throw new Error('Funding period has ended');
    }

    // Validate contribution amount
    if (dto.contributionAmount <= 0) {
      throw new Error('Contribution amount must be positive');
    }

    // Create participant record
    const participant = this.participantRepo.create({
      marketTrialId: trialId,
      participantId: dto.participantId,
      participantType: dto.participantType,
      contributionAmount: dto.contributionAmount,
    });

    const savedParticipant = await this.participantRepo.save(participant);

    // Update trial's current amount
    const newAmount = Number(trial.currentAmount) + Number(dto.contributionAmount);
    await this.trialRepo.update(trialId, {
      currentAmount: newAmount,
    });

    // Check if funding target is reached
    if (newAmount >= Number(trial.targetAmount)) {
      await this.trialRepo.update(trialId, {
        status: TrialStatus.DEVELOPMENT,
      });
    }

    return savedParticipant;
  }

  /**
   * Get participants for a trial
   */
  async getParticipants(trialId: string): Promise<MarketTrialParticipant[]> {
    return this.participantRepo.find({
      where: { marketTrialId: trialId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Evaluate and update trial status if needed
   * Called on read operations to ensure status is current
   */
  async evaluateStatusIfNeeded(trial: MarketTrial): Promise<MarketTrial> {
    // Only evaluate RECRUITING trials
    if (trial.status !== TrialStatus.RECRUITING) {
      return trial;
    }

    const now = new Date();
    const fundingEndAt = new Date(trial.fundingEndAt);

    // Check if funding period has ended
    if (now >= fundingEndAt) {
      const currentAmount = Number(trial.currentAmount);
      const targetAmount = Number(trial.targetAmount);

      if (currentAmount >= targetAmount) {
        // Funding successful - move to development
        trial.status = TrialStatus.DEVELOPMENT;
      } else {
        // Funding failed - close the trial
        trial.status = TrialStatus.CLOSED;
      }

      // Update in database
      await this.trialRepo.update(trial.id, {
        status: trial.status,
      });
    }

    return trial;
  }
}
