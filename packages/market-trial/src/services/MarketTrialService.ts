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
  productId: string;
  title: string;
  description?: string;
  trialUnitPrice: number;
  targetAmount: number;
  fundingStartAt: Date;
  fundingEndAt: Date;
  trialPeriodDays: number;
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
   * Create a new Market Trial
   */
  async createTrial(dto: CreateTrialDto): Promise<MarketTrial> {
    // Create trial entity
    const trial = this.trialRepo.create({
      supplierId: dto.supplierId,
      productId: dto.productId,
      title: dto.title,
      description: dto.description || null,
      trialUnitPrice: dto.trialUnitPrice,
      targetAmount: dto.targetAmount,
      currentAmount: 0,
      fundingStartAt: dto.fundingStartAt,
      fundingEndAt: dto.fundingEndAt,
      trialPeriodDays: dto.trialPeriodDays,
      status: TrialStatus.RECRUITING,
    });

    const savedTrial = await this.trialRepo.save(trial);

    // Create forum for this trial (placeholder - actual forum creation depends on forum-core)
    // For Phase 1, we create the mapping record with a generated forum ID
    // In production, this should call forum-core to create actual forum
    const forumId = await this.createTrialForum(savedTrial);

    if (forumId) {
      const forumMapping = this.forumRepo.create({
        marketTrialId: savedTrial.id,
        forumId: forumId,
      });
      await this.forumRepo.save(forumMapping);
    }

    return savedTrial;
  }

  /**
   * Create a forum for the trial
   * Phase 1: Returns a placeholder forum ID
   * Future: Should integrate with forum-core
   */
  private async createTrialForum(trial: MarketTrial): Promise<string | null> {
    // Phase 1: Generate a placeholder forum ID
    // In production, this should call forum-core service to create actual forum
    // Example: const forum = await forumService.createBoard({ name: `Trial: ${trial.title}` });

    // For now, we generate a UUID as placeholder
    const placeholderForumId = `forum_${trial.id}`;
    return placeholderForumId;
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
