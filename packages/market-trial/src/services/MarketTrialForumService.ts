/**
 * MarketTrialForumService
 *
 * Phase 3: Forum Integration service.
 *
 * Responsibilities:
 * - Get forum access info for a trial
 * - Check read/write permissions based on role and trial status
 * - Manage forum-trial mapping
 */

import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  TrialStatus,
  MarketTrialForum,
  MarketTrialParticipant,
  ParticipantType,
} from '../entities/index.js';

/**
 * User role types for forum access
 */
export enum ForumUserRole {
  SUPPLIER = 'supplier',
  SELLER = 'seller',
  PARTNER = 'partner',
  GUEST = 'guest',
}

/**
 * Forum access info returned by getForumAccessInfo
 */
export interface ForumAccessInfo {
  trialId: string;
  forumId: string | null;
  trialStatus: string;
  canRead: boolean;
  canWrite: boolean;
  userRole: ForumUserRole;
  accessMessage: string | null;
}

/**
 * User context for access checks
 */
export interface ForumUserContext {
  userId: string;
  supplierId?: string;
  sellerId?: string;
  partnerId?: string;
}

export class MarketTrialForumService {
  private trialRepo: Repository<MarketTrial>;
  private forumRepo: Repository<MarketTrialForum>;
  private participantRepo: Repository<MarketTrialParticipant>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.trialRepo = dataSource.getRepository(MarketTrial);
    this.forumRepo = dataSource.getRepository(MarketTrialForum);
    this.participantRepo = dataSource.getRepository(MarketTrialParticipant);
  }

  /**
   * Determine user's role in relation to the trial
   */
  private async determineUserRole(
    trial: MarketTrial,
    user: ForumUserContext
  ): Promise<ForumUserRole> {
    // Check if user is the supplier
    if (user.supplierId && trial.supplierId === user.supplierId) {
      return ForumUserRole.SUPPLIER;
    }

    // Check if user is a seller participant
    if (user.sellerId) {
      const sellerParticipant = await this.participantRepo.findOne({
        where: {
          marketTrialId: trial.id,
          participantId: user.sellerId,
          participantType: ParticipantType.SELLER,
        },
      });
      if (sellerParticipant) {
        return ForumUserRole.SELLER;
      }
    }

    // Check if user is a partner participant
    if (user.partnerId) {
      const partnerParticipant = await this.participantRepo.findOne({
        where: {
          marketTrialId: trial.id,
          participantId: user.partnerId,
          participantType: ParticipantType.PARTNER,
        },
      });
      if (partnerParticipant) {
        return ForumUserRole.PARTNER;
      }
    }

    return ForumUserRole.GUEST;
  }

  /**
   * Check if user can read forum based on role
   * Only Supplier, Seller, Partner can read
   */
  canReadByRole(role: ForumUserRole): boolean {
    return role !== ForumUserRole.GUEST;
  }

  /**
   * Check if user can write to forum based on role and trial status
   * - FAILED status: read-only (no write)
   * - GUEST: no write
   * - Others: can write
   */
  canWriteByRoleAndStatus(role: ForumUserRole, status: string): boolean {
    // Guest cannot write
    if (role === ForumUserRole.GUEST) {
      return false;
    }

    // CLOSED trial is read-only
    if (status === TrialStatus.CLOSED) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can read forum for a trial
   */
  async canRead(trial: MarketTrial, user: ForumUserContext): Promise<boolean> {
    const role = await this.determineUserRole(trial, user);
    return this.canReadByRole(role);
  }

  /**
   * Check if user can write to forum for a trial
   */
  async canWrite(trial: MarketTrial, user: ForumUserContext): Promise<boolean> {
    const role = await this.determineUserRole(trial, user);
    return this.canWriteByRoleAndStatus(role, trial.status);
  }

  /**
   * Get forum access info for a trial
   */
  async getForumAccessInfo(
    trialId: string,
    user: ForumUserContext
  ): Promise<ForumAccessInfo> {
    // Get trial
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });

    if (!trial) {
      throw new Error('Market Trial not found');
    }

    // Get forum mapping
    const forumMapping = await this.forumRepo.findOne({
      where: { marketTrialId: trialId },
    });

    // Determine user role
    const role = await this.determineUserRole(trial, user);

    // Check permissions
    const canRead = this.canReadByRole(role);
    const canWrite = this.canWriteByRoleAndStatus(role, trial.status);

    // Generate access message
    let accessMessage: string | null = null;

    if (role === ForumUserRole.GUEST) {
      accessMessage = '이 Forum에 접근하려면 Trial 참여자여야 합니다.';
    } else if (trial.status === TrialStatus.CLOSED && !canWrite) {
      accessMessage = '이 Trial은 종료되어 읽기 전용입니다.';
    }

    return {
      trialId: trial.id,
      forumId: forumMapping?.forumId || null,
      trialStatus: trial.status,
      canRead,
      canWrite,
      userRole: role,
      accessMessage,
    };
  }

  /**
   * Get forum ID for a trial
   */
  async getForumId(trialId: string): Promise<string | null> {
    const forumMapping = await this.forumRepo.findOne({
      where: { marketTrialId: trialId },
    });
    return forumMapping?.forumId || null;
  }

  /**
   * Check if forum exists for a trial
   */
  async hasForumMapping(trialId: string): Promise<boolean> {
    const count = await this.forumRepo.count({
      where: { marketTrialId: trialId },
    });
    return count > 0;
  }

  /**
   * Create forum mapping for a trial
   * Called when trial is created
   */
  async createForumMapping(trialId: string, forumId: string): Promise<MarketTrialForum> {
    const mapping = this.forumRepo.create({
      marketTrialId: trialId,
      forumId: forumId,
    });
    return await this.forumRepo.save(mapping);
  }
}
