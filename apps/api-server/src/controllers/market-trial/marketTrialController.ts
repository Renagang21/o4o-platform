/**
 * Market Trial Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * In-memory Map → TypeORM Repository 전환.
 * API 계약(엔드포인트, 요청/응답 형식) 유지.
 *
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1:
 * gateway() — 접근 상태 + 오픈 trial 정보 반환 (서비스별 유입 창구용)
 *
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1:
 * getTrials/getTrialById에 forumPostId 포함하여 개별 포럼 deep link 지원
 *
 * WO-MARKET-TRIAL-MY-PARTICIPATION-STATUS-V1:
 * getMyParticipations() — 현재 사용자의 전체 참여 목록 반환 (허브 참여 상태 표시용)
 *
 * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1:
 * getMyParticipations() 확장 — 정산 계산값 포함
 * getMyParticipationDetail() — 참여 상세 + 정산 예시
 * saveSettlementChoice() — 참여자 선택 저장 (product/cash)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  MarketTrialParticipant,
  MarketTrialForum,
  TrialStatus,
} from '@o4o/market-trial';
import { MarketTrialService } from '@o4o/market-trial';

/** Trial 참여 가능 상태 목록 */
const JOINABLE_STATUSES: TrialStatus[] = [
  TrialStatus.RECRUITING,
];

/** Trial 종료 상태 목록 */
const CLOSED_STATUSES: TrialStatus[] = [
  TrialStatus.FULFILLED,
  TrialStatus.CLOSED,
];

/**
 * WO-CLEANUP-3: APPROVED 상태 제거 후 현행화
 * Pre-launch statuses excluded from public API by default.
 * DRAFT/SUBMITTED visible only to supplier (getMyTrials).
 * (단일 승인 구조: 운영자 승인 즉시 RECRUITING 진입, APPROVED 상태 없음)
 */
const PRE_LAUNCH_STATUSES: TrialStatus[] = [
  TrialStatus.DRAFT,
  TrialStatus.SUBMITTED,
];

export class MarketTrialController {
  private static dataSource: DataSource | null = null;
  private static trialRepo: Repository<MarketTrial>;
  private static participantRepo: Repository<MarketTrialParticipant>;
  private static forumRepo: Repository<MarketTrialForum>;
  private static trialService: MarketTrialService;

  /**
   * DataSource 설정 (main.ts에서 호출)
   */
  static setDataSource(ds: DataSource) {
    this.dataSource = ds;
    this.trialRepo = ds.getRepository(MarketTrial);
    this.participantRepo = ds.getRepository(MarketTrialParticipant);
    this.forumRepo = ds.getRepository(MarketTrialForum);
    this.trialService = new MarketTrialService(ds);
  }

  /**
   * GET /api/market-trial/gateway
   * 접근 상태 + 오픈 trial 요약 반환 (서비스별 유입 창구용)
   * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1
   */
  static async gateway(req: AuthRequest, res: Response) {
    try {
      const { serviceKey } = req.query;
      const userId = (req as any).user?.id;

      const emptyResponse = (accessStatus: string) =>
        res.json({ success: true, data: { accessStatus, openTrialCount: 0, trials: [] } });

      // 1. 로그인 체크
      if (!userId) return emptyResponse('not_logged_in');

      // 2. KPA membership 체크 (service_key 'kpa'/'kpa-society' 혼재 대응)
      const membership = await MarketTrialController.dataSource!.query(
        `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key IN ('kpa', 'kpa-society')`,
        [userId],
      );
      if (!membership.length) return emptyResponse('no_kpa_membership');

      // 3. 약국 회원 체크 (organization_members + organizations)
      const orgMember = await MarketTrialController.dataSource!.query(
        `SELECT om.id FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1 AND o."isActive" = true AND om.left_at IS NULL`,
        [userId],
      );
      if (!orgMember.length) return emptyResponse('not_pharmacy_member');

      // 4. 해당 서비스의 오픈 trial 조회
      const qb = MarketTrialController.trialRepo.createQueryBuilder('trial')
        .where('trial.status = :status', { status: TrialStatus.RECRUITING });

      if (serviceKey && typeof serviceKey === 'string') {
        qb.andWhere(
          `trial."visibleServiceKeys" @> :serviceKeys::jsonb`,
          { serviceKeys: JSON.stringify([serviceKey]) },
        );
      }

      qb.orderBy('trial.createdAt', 'DESC');
      const trials = await qb.getMany();

      if (!trials.length) return emptyResponse('no_trials');

      return res.json({
        success: true,
        data: {
          accessStatus: 'accessible',
          openTrialCount: trials.length,
          trials: trials.map(toGatewayDTO),
        },
      });
    } catch (error) {
      console.error('Gateway error:', error);
      res.status(500).json({ success: false, message: 'Failed to get gateway info' });
    }
  }

  /**
   * POST /api/market-trial
   * 공급자 Trial 생성 (DRAFT)
   * WO-O4O-MARKET-TRIAL-PHASE1-V1
   */
  static async createTrial(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name || '';
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        title, description, visibleServiceKeys, outcomeSnapshot,
        maxParticipants, fundingStartAt, fundingEndAt, trialPeriodDays,
        targetAmount, trialUnitPrice, rewardRate,
      } = req.body;

      if (!title || !fundingStartAt || !fundingEndAt || !trialPeriodDays) {
        return res.status(400).json({
          success: false,
          message: 'Required: title, fundingStartAt, fundingEndAt, trialPeriodDays',
        });
      }

      const trial = await MarketTrialController.trialService.createTrial({
        supplierId: userId,
        supplierName: userName,
        title,
        description,
        visibleServiceKeys: visibleServiceKeys || [],
        outcomeSnapshot,
        maxParticipants: maxParticipants || undefined,
        targetAmount: targetAmount != null ? Number(targetAmount) : undefined,
        trialUnitPrice: trialUnitPrice != null ? Number(trialUnitPrice) : undefined,
        rewardRate: rewardRate != null ? Number(rewardRate) : undefined,
        fundingStartAt: new Date(fundingStartAt),
        fundingEndAt: new Date(fundingEndAt),
        trialPeriodDays: Number(trialPeriodDays),
      });

      res.status(201).json({ success: true, data: toTrialDTO(trial) });
    } catch (error) {
      console.error('Create trial error:', error);
      res.status(500).json({ success: false, message: 'Failed to create trial' });
    }
  }

  /**
   * PATCH /api/market-trial/:id/submit
   * Trial 제출 (DRAFT → SUBMITTED)
   * WO-O4O-MARKET-TRIAL-PHASE1-V1
   */
  static async submitTrial(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const trial = await MarketTrialController.trialService.submitTrial(req.params.id, userId);
      res.json({ success: true, data: toTrialDTO(trial) });
    } catch (error: any) {
      console.error('Submit trial error:', error);
      const msg = error.message || 'Failed to submit trial';
      const status = msg.includes('not found') ? 404 : msg.includes('Not authorized') ? 403 : 400;
      res.status(status).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/market-trial/my
   * 공급자 본인 Trial 목록
   * WO-O4O-MARKET-TRIAL-PHASE1-V1
   */
  static async getMyTrials(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const trials = await MarketTrialController.trialRepo.find({
        where: { supplierId: userId },
        order: { createdAt: 'DESC' },
      });

      res.json({ success: true, data: trials.map((t) => toTrialDTO(t)) });
    } catch (error) {
      console.error('Get my trials error:', error);
      res.status(500).json({ success: false, message: 'Failed to get trials' });
    }
  }

  /**
   * GET /api/market-trial/my-participations
   * 현재 사용자가 참여한 Trial 목록 (참여 상태 + Trial 요약 포함)
   * WO-MARKET-TRIAL-MY-PARTICIPATION-STATUS-V1
   */
  static async getMyParticipations(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const participations = await MarketTrialController.participantRepo.find({
        where: { participantId: userId },
        order: { createdAt: 'DESC' },
      });

      if (participations.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Batch-fetch trial data for all participations
      const trialIds = participations.map((p) => p.marketTrialId);
      const trials = await MarketTrialController.trialRepo
        .createQueryBuilder('trial')
        .where('trial.id IN (:...ids)', { ids: trialIds })
        .getMany();

      const trialMap = new Map(trials.map((t) => [t.id, t]));

      const data = participations.map((p) => {
        const trial = trialMap.get(p.marketTrialId);
        const settlementCalc = trial ? calcSettlementForParticipant(p, trial) : null;
        return {
          ...toParticipationDTO(p),
          ...settlementCalc,
          trial: trial ? {
            id: trial.id,
            title: trial.title,
            status: trial.status,
            supplierName: trial.supplierName || undefined,
          } : undefined,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get my participations error:', error);
      res.status(500).json({ success: false, message: 'Failed to get participations' });
    }
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
      } else {
        // WO-O4O-MARKET-TRIAL-PHASE1-POST-STABILIZATION-VERIFY-V1:
        // Default: exclude pre-launch statuses (DRAFT/SUBMITTED/APPROVED)
        // from public list. These are visible only via supplier/operator endpoints.
        qb.andWhere('trial.status NOT IN (:...preLaunch)', { preLaunch: PRE_LAUNCH_STATUSES });
      }

      qb.orderBy('trial.createdAt', 'DESC');

      const trials = await qb.getMany();

      // WO-O4O-MARKET-TRIAL-PHASE1-STABILIZATION-V1:
      // Evaluate RECRUITING trials that may have expired (fundingEndAt passed)
      const evaluated = await Promise.all(
        trials.map((t) => MarketTrialController.trialService.evaluateStatusIfNeeded(t)),
      );

      // WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1:
      // Bulk-fetch forum post IDs for all trials
      const trialIds = evaluated.map((t) => t.id);
      const forumMap = await buildForumPostMap(MarketTrialController.forumRepo, trialIds);

      res.json({
        success: true,
        data: evaluated.map((t) => toTrialDTO(t, forumMap.get(t.id))),
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

      // WO-O4O-MARKET-TRIAL-PHASE1-STABILIZATION-V1: evaluate expired status
      const evaluated = await MarketTrialController.trialService.evaluateStatusIfNeeded(trial);

      // WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1: forum deep link
      const forumMapping = await MarketTrialController.forumRepo.findOne({
        where: { marketTrialId: id },
      });

      res.json({
        success: true,
        data: toTrialDTO(evaluated, forumMapping?.forumId),
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
   * GET /api/market-trial/:id/results
   * 공급자용 Trial 결과 조회 (집계 통계 + 포럼 링크, 개인 정보 미포함)
   * WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1
   */
  static async getSupplierTrialResults(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const trial = await MarketTrialController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }
      if (trial.supplierId !== userId) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Aggregate participant stats (no individual info exposed)
      const rows = await MarketTrialController.participantRepo.find({
        where: { marketTrialId: id },
        select: ['rewardType', 'rewardStatus', 'customerConversionStatus'] as any,
      });

      const totalCount = rows.length;
      const productCount = rows.filter((r) => r.rewardType === 'product').length;
      const cashCount = rows.filter((r) => r.rewardType === 'cash').length;
      const fulfilledCount = rows.filter((r) => r.rewardStatus === 'fulfilled').length;
      const fulfillmentRate = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
      const recruitRate = trial.maxParticipants
        ? Math.round((totalCount / trial.maxParticipants) * 100)
        : null;

      // WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1: conversion pipeline distribution
      const conversionDistribution = {
        none:        rows.filter((r: any) => !r.customerConversionStatus || r.customerConversionStatus === 'none').length,
        interested:  rows.filter((r: any) => r.customerConversionStatus === 'interested').length,
        considering: rows.filter((r: any) => r.customerConversionStatus === 'considering').length,
        adopted:     rows.filter((r: any) => r.customerConversionStatus === 'adopted').length,
        first_order: rows.filter((r: any) => r.customerConversionStatus === 'first_order').length,
      };

      // WO-MARKET-TRIAL-LISTING-AUTOLINK-V1: count store listings created from this trial
      let listingCount = 0;
      if (MarketTrialController.dataSource) {
        const listingCountRows: Array<{ cnt: number }> = await MarketTrialController.dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM organization_product_listings
           WHERE source_type = 'market_trial' AND source_id = $1`,
          [id],
        );
        listingCount = listingCountRows[0]?.cnt ?? 0;
      }

      // Forum link
      const forumMapping = await MarketTrialController.forumRepo.findOne({
        where: { marketTrialId: id },
      });

      res.json({
        success: true,
        data: {
          trial: toTrialDTO(trial, forumMapping?.forumId),
          summary: {
            totalCount,
            productCount,
            cashCount,
            fulfilledCount,
            pendingCount: totalCount - fulfilledCount,
            fulfillmentRate,
            recruitRate,
            conversionDistribution,
            listingCount,
          },
          forumPostId: forumMapping?.forumId || null,
        },
      });
    } catch (error) {
      console.error('Get supplier trial results error:', error);
      res.status(500).json({ success: false, message: 'Failed to get trial results' });
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
        participantType: 'seller', // WO-O4O-MARKET-TRIAL-PHASE1-V1: seller only
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

  /**
   * GET /api/market-trial/:id/my-settlement
   * 현재 사용자의 특정 Trial 참여 상세 + 정산 계산 정보
   * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1
   */
  static async getMyParticipationDetail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const participation = await MarketTrialController.participantRepo.findOne({
        where: { marketTrialId: id, participantId: userId },
      });
      if (!participation) {
        return res.status(404).json({ success: false, message: 'Participation not found' });
      }

      const trial = await MarketTrialController.trialRepo.findOne({ where: { id } });
      const settlementCalc = trial ? calcSettlementForParticipant(participation, trial) : null;

      const forumMapping = await MarketTrialController.forumRepo.findOne({
        where: { marketTrialId: id },
      });

      res.json({
        success: true,
        data: {
          ...toParticipationDTO(participation),
          ...settlementCalc,
          trial: trial ? toTrialDTO(trial, forumMapping?.forumId) : undefined,
        },
      });
    } catch (error) {
      console.error('Get my participation detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to get participation detail' });
    }
  }

  /**
   * POST /api/market-trial/:id/settlement-choice
   * 참여자 정산 선택 저장 (product | cash)
   * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1
   */
  static async saveSettlementChoice(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { choice } = req.body;
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!choice || !['product', 'cash'].includes(choice)) {
        return res.status(400).json({ success: false, message: 'choice must be "product" or "cash"' });
      }

      const participation = await MarketTrialController.participantRepo.findOne({
        where: { marketTrialId: id, participantId: userId },
      });
      if (!participation) {
        return res.status(404).json({ success: false, message: 'Participation not found' });
      }

      // 상태 전이 보호: 이미 오프라인 정산 완료 시 변경 금지
      if (participation.settlementStatus === 'offline_settled') {
        return res.status(400).json({
          success: false,
          message: '정산이 완료된 참여는 선택을 변경할 수 없습니다.',
        });
      }

      // 선택 가능 상태 검증: pending은 아직 선택 불가
      if (participation.settlementStatus === 'pending') {
        return res.status(400).json({
          success: false,
          message: '아직 정산 선택이 가능한 시점이 아닙니다.',
        });
      }

      const trial = await MarketTrialController.trialRepo.findOne({ where: { id } });
      const settlementCalc = trial ? calcSettlementForParticipant(participation, trial) : null;

      // 선택 저장 + 상태 → choice_completed
      await MarketTrialController.participantRepo.update(participation.id, {
        settlementChoice: choice,
        settlementStatus: 'choice_completed',
        settlementAmount: settlementCalc?.totalSettlementAmount ?? null,
        settlementProductQty: choice === 'product' ? (settlementCalc?.estimatedProductQty ?? null) : null,
        settlementRemainder: choice === 'product' ? (settlementCalc?.estimatedRemainder ?? null) : null,
      } as any);

      const updated = await MarketTrialController.participantRepo.findOne({
        where: { id: participation.id },
      });

      res.json({
        success: true,
        data: {
          ...toParticipationDTO(updated!),
          ...calcSettlementForParticipant(updated!, trial),
        },
        message: '선택이 저장되었습니다.',
      });
    } catch (error) {
      console.error('Save settlement choice error:', error);
      res.status(500).json({ success: false, message: 'Failed to save settlement choice' });
    }
  }
}

/**
 * Convert trial entity to legacy-compatible DTO format
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1: forumPostId 추가
 */
function toTrialDTO(trial: MarketTrial, forumPostId?: string | null): any {
  const targetAmount = Number(trial.targetAmount) || 0;
  const currentAmount = Number(trial.currentAmount) || 0;
  const trialUnitPrice = Number(trial.trialUnitPrice) || 0;
  const rewardRate = Number(trial.rewardRate) || 0;
  const maxParticipants = trial.maxParticipants || null;
  const currentParticipants = trial.currentParticipants;

  // 달성률 계산 (WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1)
  const amountRate = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : null;
  const recruitRate = maxParticipants ? Math.round((currentParticipants / maxParticipants) * 100) : null;

  // 정산 미리보기 (단가 1단위 참여 기준)
  let settlementPreview: { totalAmount: number; productQty: number; remainder: number } | null = null;
  if (trialUnitPrice > 0 || rewardRate > 0) {
    const base = trialUnitPrice > 0 ? trialUnitPrice : 10000;
    const total = base * (1 + rewardRate / 100);
    const qty = trialUnitPrice > 0 ? Math.floor(total / trialUnitPrice) : 0;
    const rem = trialUnitPrice > 0 ? total - qty * trialUnitPrice : total;
    settlementPreview = { totalAmount: Math.round(total), productQty: qty, remainder: Math.round(rem) };
  }

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
    maxParticipants: maxParticipants || undefined,
    currentParticipants,
    startDate: trial.fundingStartAt ? new Date(trial.fundingStartAt).toISOString() : undefined,
    endDate: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    deadline: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    visibleServiceKeys: trial.visibleServiceKeys,
    forumPostId: forumPostId || undefined,
    // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
    convertedProductId: trial.convertedProductId || null,
    convertedProductName: trial.convertedProductName || null,
    conversionNote: trial.conversionNote || null,
    // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
    targetAmount: targetAmount || null,
    currentAmount: currentAmount || 0,
    trialUnitPrice: trialUnitPrice || null,
    rewardRate: rewardRate || 0,
    amountRate,
    recruitRate,
    settlementPreview,
    createdAt: new Date(trial.createdAt).toISOString(),
  };
}

/**
 * Bulk-fetch forum post IDs for a list of trial IDs
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
 */
async function buildForumPostMap(
  forumRepo: Repository<MarketTrialForum>,
  trialIds: string[],
): Promise<Map<string, string>> {
  if (trialIds.length === 0) return new Map();
  const mappings = await forumRepo
    .createQueryBuilder('mtf')
    .where('mtf.marketTrialId IN (:...ids)', { ids: trialIds })
    .getMany();
  return new Map(mappings.map((m) => [m.marketTrialId, m.forumId]));
}

/**
 * Convert trial entity to lightweight gateway DTO
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1
 */
function toGatewayDTO(trial: MarketTrial): any {
  return {
    id: trial.id,
    title: trial.title,
    status: trial.status,
    supplierName: trial.supplierName || undefined,
    currentParticipants: trial.currentParticipants,
    maxParticipants: trial.maxParticipants || undefined,
    fundingEndAt: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
  };
}

/**
 * Convert participant entity to DTO format
 * Phase 2: 정산 필드 포함
 */
function toParticipationDTO(p: MarketTrialParticipant): any {
  return {
    id: p.id,
    trialId: p.marketTrialId,
    participantId: p.participantId,
    role: p.participantType,
    rewardType: p.rewardType || 'cash',
    rewardStatus: p.rewardStatus,
    // Phase 2 settlement fields
    settlementChoice: p.settlementChoice ?? null,
    settlementStatus: p.settlementStatus || 'pending',
    settlementAmount: p.settlementAmount != null ? Number(p.settlementAmount) : null,
    settlementProductQty: p.settlementProductQty ?? null,
    settlementRemainder: p.settlementRemainder != null ? Number(p.settlementRemainder) : null,
    creditProcessStatus: p.creditProcessStatus || 'not_applicable',
    settlementNote: p.settlementNote ?? null,
    joinedAt: new Date(p.createdAt).toISOString(),
  };
}

/**
 * 참여자 기준 정산 계산값 반환
 * contributionAmount(참여금) × (1 + rewardRate/100) = totalSettlementAmount
 * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1
 */
function calcSettlementForParticipant(
  p: MarketTrialParticipant,
  trial: MarketTrial,
): {
  contributionAmount: number;
  rewardRate: number;
  totalSettlementAmount: number;
  trialUnitPrice: number | null;
  estimatedProductQty: number | null;
  estimatedRemainder: number | null;
} {
  const contribution = Number(p.contributionAmount) || 0;
  const rewardRate = Number(trial.rewardRate) || 0;
  const unitPrice = Number(trial.trialUnitPrice) || 0;
  const totalSettlementAmount = Math.round(contribution * (1 + rewardRate / 100));

  let estimatedProductQty: number | null = null;
  let estimatedRemainder: number | null = null;
  if (unitPrice > 0) {
    estimatedProductQty = Math.floor(totalSettlementAmount / unitPrice);
    estimatedRemainder = Math.round(totalSettlementAmount - estimatedProductQty * unitPrice);
  }

  return {
    contributionAmount: contribution,
    rewardRate,
    totalSettlementAmount,
    trialUnitPrice: unitPrice || null,
    estimatedProductQty,
    estimatedRemainder,
  };
}
