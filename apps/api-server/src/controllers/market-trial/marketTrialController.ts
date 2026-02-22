/**
 * Market Trial Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * In-memory Map → TypeORM Repository 전환.
 * API 계약(엔드포인트, 요청/응답 형식) 유지.
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  MarketTrialParticipant,
  TrialStatus,
} from '@o4o/market-trial';

/** Trial 참여 가능 상태 목록 */
const JOINABLE_STATUSES: TrialStatus[] = [
  TrialStatus.RECRUITING,
];

/** Trial 종료 상태 목록 */
const CLOSED_STATUSES: TrialStatus[] = [
  TrialStatus.FULFILLED,
  TrialStatus.CLOSED,
];

export class MarketTrialController {
  private static dataSource: DataSource | null = null;
  private static trialRepo: Repository<MarketTrial>;
  private static participantRepo: Repository<MarketTrialParticipant>;

  /**
   * DataSource 설정 (main.ts에서 호출)
   */
  static setDataSource(ds: DataSource) {
    this.dataSource = ds;
    this.trialRepo = ds.getRepository(MarketTrial);
    this.participantRepo = ds.getRepository(MarketTrialParticipant);
  }

  /**
   * GET /api/market-trial
   * Trial 목록 조회
   */
  static async getTrials(req: AuthRequest, res: Response) {
    try {
      const { status, serviceKey } = req.query;

      const qb = MarketTrialController.trialRepo.createQueryBuilder('trial');

      // WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1: service-scoped visibility filter
      if (serviceKey && typeof serviceKey === 'string') {
        qb.andWhere(
          `trial."visibleServiceKeys" @> :serviceKeys::jsonb`,
          { serviceKeys: JSON.stringify([serviceKey]) },
        );
      }

      if (status === 'open' || status === 'recruiting') {
        qb.andWhere('trial.status IN (:...statuses)', { statuses: JOINABLE_STATUSES });
      } else if (status === 'closed') {
        qb.andWhere('trial.status IN (:...statuses)', { statuses: CLOSED_STATUSES });
      } else if (status && Object.values(TrialStatus).includes(status as TrialStatus)) {
        qb.andWhere('trial.status = :status', { status });
      }

      qb.orderBy('trial.createdAt', 'DESC');

      const trials = await qb.getMany();

      res.json({
        success: true,
        data: trials.map(toTrialDTO),
      });
    } catch (error) {
      console.error('Get trials error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trials',
      });
    }
  }

  /**
   * GET /api/market-trial/:id
   * Trial 상세 조회
   */
  static async getTrialById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const trial = await MarketTrialController.trialRepo.findOne({ where: { id } });

      if (!trial) {
        return res.status(404).json({
          success: false,
          message: 'Trial not found',
        });
      }

      res.json({
        success: true,
        data: toTrialDTO(trial),
      });
    } catch (error) {
      console.error('Get trial error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trial',
      });
    }
  }

  /**
   * GET /api/market-trial/:id/participation
   * 현재 사용자의 참여 정보 조회
   */
  static async getParticipation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const participation = await MarketTrialController.participantRepo.findOne({
        where: {
          marketTrialId: id,
          participantId: userId,
        },
      });

      res.json({
        success: true,
        data: participation ? toParticipationDTO(participation) : null,
      });
    } catch (error) {
      console.error('Get participation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get participation',
      });
    }
  }

  /**
   * POST /api/market-trial/:id/join
   * Trial 참여 (보상 선택 포함)
   */
  static async joinTrial(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rewardType } = req.body;
      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name || 'User';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!rewardType || !['cash', 'product'].includes(rewardType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward type. Must be "cash" or "product".',
        });
      }

      const trial = await MarketTrialController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({
          success: false,
          message: 'Trial not found',
        });
      }

      if (!JOINABLE_STATUSES.includes(trial.status)) {
        return res.status(400).json({
          success: false,
          message: 'Trial is not accepting participants',
        });
      }

      if (
        trial.maxParticipants &&
        trial.currentParticipants >= trial.maxParticipants
      ) {
        return res.status(400).json({
          success: false,
          message: 'Trial has reached maximum participants',
        });
      }

      if (!trial.rewardOptions.includes(rewardType)) {
        return res.status(400).json({
          success: false,
          message: `Reward type "${rewardType}" is not available for this trial`,
        });
      }

      // Check duplicate participation
      const existing = await MarketTrialController.participantRepo.findOne({
        where: {
          marketTrialId: id,
          participantId: userId,
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Already participated in this trial',
        });
      }

      // Create participation
      const participation = MarketTrialController.participantRepo.create({
        marketTrialId: id,
        participantId: userId,
        participantType: 'partner', // TODO: Get actual role from user
        contributionAmount: 0,
        rewardType,
        rewardStatus: 'pending',
      });

      const saved = await MarketTrialController.participantRepo.save(participation);

      // Update participant count
      await MarketTrialController.trialRepo.update(id, {
        currentParticipants: () => '"currentParticipants" + 1',
      });

      res.status(201).json({
        success: true,
        data: toParticipationDTO(saved),
        message: 'Successfully joined the trial',
      });
    } catch (error) {
      console.error('Join trial error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join trial',
      });
    }
  }
}

/**
 * Convert trial entity to legacy-compatible DTO format
 */
function toTrialDTO(trial: MarketTrial): any {
  return {
    id: trial.id,
    title: trial.title,
    description: trial.description,
    supplierId: trial.supplierId,
    supplierName: trial.supplierName || undefined,
    eligibleRoles: trial.eligibleRoles,
    rewardOptions: trial.rewardOptions,
    productRewardDescription: trial.outcomeSnapshot?.description,
    status: trial.status,
    outcomeSnapshot: trial.outcomeSnapshot,
    maxParticipants: trial.maxParticipants || undefined,
    currentParticipants: trial.currentParticipants,
    startDate: trial.fundingStartAt ? new Date(trial.fundingStartAt).toISOString() : undefined,
    endDate: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    deadline: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    visibleServiceKeys: trial.visibleServiceKeys,
    createdAt: new Date(trial.createdAt).toISOString(),
  };
}

/**
 * Convert participant entity to legacy-compatible DTO format
 */
function toParticipationDTO(p: MarketTrialParticipant): any {
  return {
    id: p.id,
    trialId: p.marketTrialId,
    participantId: p.participantId,
    role: p.participantType,
    rewardType: p.rewardType || 'cash',
    rewardStatus: p.rewardStatus,
    joinedAt: new Date(p.createdAt).toISOString(),
  };
}
