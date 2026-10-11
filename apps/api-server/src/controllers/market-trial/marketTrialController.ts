/**
 * Market Trial Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * In-memory Map → TypeORM Repository 전환.
 * API 계약(엔드포인트, 요청/응답 형식) 유지.
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
import { marketTrialNotification } from '../../services/marketTrial.notification.js';
import { computeKpiSnapshot } from './marketTrialOperatorController.js';
import logger from '../../utils/logger.js';
import { createRequireActiveSupplier } from '../../modules/neture/middleware/neture-identity.middleware.js';
import type { RequestHandler } from 'express';
import { fundingReview, fundingOwnerContext, fundingForumSlug, fundingForumCode, FUNDING_PUBLIC_STATUSES, isFundingPublic } from '../../services/funding/funding-review.js';
import { isFundingCreator, resolveFundingAccess } from '../../services/funding/funding-access.js';
import { FundingWorkspaceService, FundingError } from '../../services/funding/funding-workspace.service.js';

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

function fundingUpdatePayload(body: AuthRequest['body']) {
  const {
    title, oneLiner, videoUrl, description, outcomeSnapshot,
    maxParticipants, fundingStartAt, fundingEndAt, trialPeriodDays,
    targetAmount, trialUnitPrice, rewardRate, salesScenarioContent,
  } = body;

  return {
    title,
    oneLiner,
    videoUrl,
    description,
    salesScenarioContent,
    outcomeSnapshot,
    maxParticipants: maxParticipants != null ? Number(maxParticipants) : undefined,
    targetAmount: targetAmount != null ? Number(targetAmount) : undefined,
    trialUnitPrice: trialUnitPrice != null ? Number(trialUnitPrice) : undefined,
    rewardRate: rewardRate != null ? Number(rewardRate) : undefined,
    fundingStartAt: fundingStartAt ? new Date(fundingStartAt) : undefined,
    fundingEndAt: fundingEndAt ? new Date(fundingEndAt) : undefined,
    trialPeriodDays: trialPeriodDays ? Number(trialPeriodDays) : undefined,
  };

}

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

  static readonly requireActiveCreator: RequestHandler = (req, res, next) => {
    const ds = MarketTrialController.dataSource;
    if (!ds) { res.status(503).json({ success: false, message: 'Service unavailable' }); return; }
    void createRequireActiveSupplier(ds)(req, res, next).catch(next);
  };

  static creatorEligibility(req: AuthRequest, res: Response) {
    res.json({ success: true, data: { supplierAccountId: (req as any).supplierId, supplierOrganizationId: (req as any).supplierOrganizationId } });
  }

  static async getForumAccess(req: AuthRequest, res: Response) {
    try {
      const access = await resolveFundingAccess(MarketTrialController.dataSource!, req.params.id, (req as any).user?.id);
      if (!access || (!access.creator && !access.operator && !access.participant)) return res.status(403).json({ success: false, message: '해당 펀딩 참여자만 포럼을 이용할 수 있습니다.' });
      res.json({ success: true, data: { forum: access.forum, canRead: access.canRead, canWrite: access.canWrite, canManage: access.canManage, canModerate: access.canModerate, participant: access.participant, member: access.member } });
    } catch (error) { logger.error('[Funding] forum access failed', error); res.status(500).json({ success: false, message: '포럼 이용 상태를 확인하지 못했습니다.' }); }
  }

  static async getCreatorParticipants(req: AuthRequest, res: Response) {
    try {
      const trial = await MarketTrialController.trialRepo.findOne({ where: { id: req.params.id } });
      if (!trial || !await isFundingCreator(MarketTrialController.dataSource!, trial, req.user!.id)) return res.status(403).json({ success: false, message: '자기 펀딩만 조회할 수 있습니다.' });
      const rows = await MarketTrialController.dataSource!.query(`SELECT p.id, COALESCE(u.name, '회원') AS name, p."paymentStatus" AS "paymentStatus"
        FROM market_trial_participants p LEFT JOIN users u ON u.id = p."participantId" WHERE p."marketTrialId" = $1 ORDER BY p."createdAt", p.id`, [trial.id]);
      res.json({ success: true, data: rows });
    } catch (error) { logger.error('[Funding] creator participants failed', error); res.status(500).json({ success: false, message: '참여 현황 조회에 실패했습니다.' }); }
  }

  static async changeCreatorStatus(req: AuthRequest, res: Response) {
    try {
      const trial = await MarketTrialController.trialRepo.findOne({ where: { id: req.params.id } });
      if (!trial || !await isFundingCreator(MarketTrialController.dataSource!, trial, req.user!.id)) return res.status(403).json({ success: false, message: '자기 펀딩만 관리할 수 있습니다.' });
      const changed = await new FundingWorkspaceService(MarketTrialController.dataSource!).changeStatus(trial.id, req.user!.id, req.body.status, true);
      if (changed.status === TrialStatus.DEVELOPMENT) void marketTrialNotification.onRecruitingResult(changed.id, true, req.user!.id);
      else if (changed.status === TrialStatus.OUTCOME_CONFIRMING) void marketTrialNotification.onOutcomeConfirming(changed.id, req.user!.id);
      else if (changed.status === TrialStatus.FULFILLED) void marketTrialNotification.onFulfilled(changed.id, req.user!.id);
      res.json({ success: true, data: toTrialDTO(changed) });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      logger.error('[Funding] creator progress failed', error);
      res.status(500).json({ success: false, message: '진행 상태를 변경하지 못했습니다.' });
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
        title, oneLiner, videoUrl, description, outcomeSnapshot,
        maxParticipants, fundingStartAt, fundingEndAt, trialPeriodDays,
        targetAmount, trialUnitPrice, rewardRate, salesScenarioContent,
        // WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1
        productId,
      } = req.body;

      if (!validFundingFields(req.body)) {
        return res.status(400).json({
          success: false,
          message: 'Required: title, fundingStartAt, fundingEndAt, trialPeriodDays',
        });
      }

      const trial = await MarketTrialController.trialService.createTrial({
        supplierId: userId,
        supplierName: userName,
        initialHistory: [{ from: 'draft', to: 'draft', at: new Date().toISOString(), reason: 'funding_created', auto: false,
          actorUserId: userId, supplierAccountId: (req as any).supplierId, supplierOrganizationId: (req as any).supplierOrganizationId ?? null } as any],
        // WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1: 선택 상품(ProductMaster) soft 참조
        productId: productId || undefined,
        title,
        oneLiner: oneLiner || undefined,
        videoUrl: videoUrl || undefined,
        description,
        outcomeSnapshot,
        maxParticipants: maxParticipants || undefined,
        targetAmount: targetAmount != null ? Number(targetAmount) : undefined,
        trialUnitPrice: trialUnitPrice != null ? Number(trialUnitPrice) : undefined,
        rewardRate: rewardRate != null ? Number(rewardRate) : undefined,
        salesScenarioContent: salesScenarioContent || undefined,
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

      const existing = await MarketTrialController.trialRepo.findOne({ where: { id: req.params.id } });
      if (!existing || !await isFundingCreator(MarketTrialController.dataSource!, existing, userId)) return res.status(403).json({ success: false, message: '자기 펀딩만 신청할 수 있습니다.' });
      const trial = await MarketTrialController.trialService.submitTrial(req.params.id, userId);
      void marketTrialNotification.onSubmitted(trial);
      res.json({ success: true, data: toTrialDTO(trial) });
    } catch (error: any) {
      console.error('Submit trial error:', error);
      const msg = error.message || 'Failed to submit trial';
      const status = msg.includes('not found') ? 404 : msg.includes('Not authorized') ? 403 : 400;
      res.status(status).json({ success: false, message: msg });
    }
  }

  /**
   * PATCH /api/market-trial/:id
   * DRAFT Trial 수정
   * WO-MARKET-TRIAL-EDIT-FLOW-V1
   */
  static async updateTrial(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { id } = req.params;
      const existing = await MarketTrialController.trialRepo.findOne({ where: { id } });
      if (!existing || !await isFundingCreator(MarketTrialController.dataSource!, existing, userId)) return res.status(403).json({ success: false, message: '자기 펀딩만 수정할 수 있습니다.' });
      if (!validFundingFields({ ...existing, ...req.body })) return res.status(400).json({ success: false, message: '모집 기간·수량·금액 입력을 확인해 주세요.' });
      const trial = await MarketTrialController.trialService.updateTrial(id, userId, fundingUpdatePayload(req.body));

      res.json({ success: true, data: toTrialDTO(trial) });
    } catch (error: any) {
      console.error('Update trial error:', error);
      const msg = error.message || 'Failed to update trial';
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

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 batch 조회
      const productMap = await buildProductRefMap(
        MarketTrialController.dataSource,
        trials.map((t) => t.productId),
      );

      res.json({
        success: true,
        data: trials.filter(t => !fundingOwnerContext(t)?.supplierAccountId || fundingOwnerContext(t)?.supplierAccountId === (req as any).supplierId).map((t) => ({ ...toTrialDTO(t, undefined, productMap.get(t.productId ?? '')), ...fundingReview(t) })),
      });
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
      const { status } = req.query;
      if (status && (typeof status !== 'string' || !['open', 'recruiting', 'closed', ...FUNDING_PUBLIC_STATUSES].includes(status))) return res.status(400).json({ success: false, message: 'Invalid public status filter' });

      const qb = MarketTrialController.trialRepo.createQueryBuilder('trial');

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

      const trials = (await qb.getMany()).filter(isFundingPublic);

      // WO-O4O-MARKET-TRIAL-PHASE1-STABILIZATION-V1:
      // Evaluate RECRUITING trials that may have expired (fundingEndAt passed)
      const evaluated = await Promise.all(
        trials.map((t) => MarketTrialController.trialService.evaluateStatusIfNeeded(t)),
      );

      // WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1:
      // Bulk-fetch forum post IDs for all trials
      const trialIds = evaluated.map((t) => t.id);
      const forumMap = await buildForumPostMap(MarketTrialController.forumRepo, trialIds);

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 batch 조회
      const productMap = await buildProductRefMap(
        MarketTrialController.dataSource,
        evaluated.map((t) => t.productId),
      );

      res.json({
        success: true,
        data: evaluated.map((t) => toTrialDTO(t, forumMap.get(t.id), productMap.get(t.productId ?? ''))),
      });
    } catch (error) {
      // WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1 §E:
      // 프로덕션에서 이 경로의 500 이 관측됐으나(30일 2건, 검색엔진 봇의 목록 호출)
      // console.error 로만 남아 Cloud Logging 에서 severity·stack 으로 조회되지 않아
      // 원인을 특정할 수 없었다. 추측 수정 대신 진단 가능한 로그로 교체한다.
      logger.error('[MarketTrial] getTrials failed', {
        event: 'market_trial.get_trials_error',
        statusFilter: (req.query?.status as string) ?? null,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
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

      if (!trial || !isFundingPublic(trial)) {
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

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 조회
      const productMap = await buildProductRefMap(MarketTrialController.dataSource, [evaluated.productId]);

      res.json({
        success: true,
        data: toTrialDTO(evaluated, forumMapping?.forumId, productMap.get(evaluated.productId ?? '')),
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
      if (!await isFundingCreator(MarketTrialController.dataSource!, trial, userId)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Aggregate participant stats (no individual info exposed)
      // WO-O4O-MARKET-TRIAL-CONVERSION-READ-WIRING-CLEANUP-V1:
      // content-only — 전환 분포(conversionDistribution)·매장 진열(listingCount) 집계 제거.
      const rows = await MarketTrialController.participantRepo.find({
        where: { marketTrialId: id },
        select: ['rewardType', 'rewardStatus'] as any,
      });

      const totalCount = rows.length;
      const productCount = rows.filter((r) => r.rewardType === 'product').length;
      const cashCount = rows.filter((r) => r.rewardType === 'cash').length;
      const fulfilledCount = rows.filter((r) => r.rewardStatus === 'fulfilled').length;
      const fulfillmentRate = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
      const recruitRate = trial.maxParticipants
        ? Math.round((totalCount / trial.maxParticipants) * 100)
        : null;

      // Forum link
      const forumMapping = await MarketTrialController.forumRepo.findOne({
        where: { marketTrialId: id },
      });

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 조회
      const productMap = await buildProductRefMap(MarketTrialController.dataSource, [trial.productId]);

      const [workspaceForum] = await MarketTrialController.dataSource!.query('SELECT id, slug FROM forum_category_requests WHERE slug = $1 AND service_code = $2 AND status = \'completed\' LIMIT 1', [fundingForumSlug(id), fundingForumCode(id)]);
      res.json({
        success: true,
        data: {
          forum: workspaceForum ?? null,
          trial: { ...toTrialDTO(trial, forumMapping?.forumId, productMap.get(trial.productId ?? '')), ...fundingReview(trial) },
          summary: {
            totalCount,
            productCount,
            cashCount,
            fulfilledCount,
            pendingCount: totalCount - fulfilledCount,
            fulfillmentRate,
            recruitRate,
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

      const { trial, participant: saved } = await new FundingWorkspaceService(MarketTrialController.dataSource!).join(id, userId, rewardType);

      // WO-NETURE-MARKET-TRIAL-NOTIFICATION-INTEGRATION-V1: notify participant of join.
      // Idempotent at the call site — duplicate-participation check above (line ~588) blocks repeats.
      void marketTrialNotification.onJoined(trial, userId);

      res.status(201).json({
        success: true,
        data: toParticipationDTO(saved),
        message: 'Successfully joined the trial',
      });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
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
      // WO-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1:
      // 유통참여형 펀딩 = Neture 전용 content-only 모집. 신규 정산 선택(제품/현금) 저장을 중단한다.
      // (기존 settlementChoice/Status 데이터는 건드리지 않음 — 신규 mutation 만 차단.)
      return res.status(409).json({
        success: false,
        error: 'Market Trial settlement is disabled by content-only boundary policy.',
        message: '유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다.',
        code: 'MARKET_TRIAL_SETTLEMENT_DISABLED',
      });

      // eslint-disable-next-line no-unreachable -- 정책 비활성화. 기존 로직 보존(정의 재확인 시 참조).
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
 * WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: productId/product (표시 전용 soft 참조) 추가
 */
function toTrialDTO(
  trial: MarketTrial,
  forumPostId?: string | null,
  productRef?: TrialProductRef | null,
): any {
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
    oneLiner: trial.oneLiner || null,
    videoUrl: trial.videoUrl || null,
    description: trial.description,
    salesScenarioContent: trial.salesScenarioContent || null,
    supplierId: trial.supplierId,
    supplierName: trial.supplierName || undefined,
    eligibleRoles: trial.eligibleRoles,
    rewardOptions: trial.rewardOptions,
    productRewardDescription: trial.outcomeSnapshot?.description,
    status: trial.status,
    outcomeSnapshot: trial.outcomeSnapshot,
    maxParticipants: maxParticipants || undefined,
    currentParticipants,
    trialPeriodDays: trial.trialPeriodDays,
    startDate: trial.fundingStartAt ? new Date(trial.fundingStartAt).toISOString() : undefined,
    endDate: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    deadline: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    forumPostId: forumPostId || undefined,
    // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2:
    // 공급자가 등록 상품(ProductMaster) 기준으로 개설한 펀딩의 연결 제품 표시.
    // productId 없는 기존 펀딩은 둘 다 null. 가격/원본 복제 없음.
    productId: trial.productId || null,
    product: productRef || null,
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
 * WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2:
 * 연결 제품(ProductMaster) 표시용 요약. 가격/재고 등 운영 데이터는 담지 않는다(표시 전용).
 */
export interface TrialProductRef {
  id: string;
  name: string;
  regulatoryType: string | null;
  drugCategory: string | null;
  manufacturerName: string | null;
}

/**
 * productId(soft 참조)로 연결된 ProductMaster 요약을 batch 조회한다.
 * - Raw SQL + parameter binding (Boundary Policy Guard Rule 2).
 * - 조회 실패/제품 부재는 표시 누락으로만 degrade — 펀딩 목록/상세 자체는 깨지지 않는다.
 */
async function buildProductRefMap(
  ds: DataSource | null,
  productIds: Array<string | null | undefined>,
): Promise<Map<string, TrialProductRef>> {
  const ids = Array.from(new Set(productIds.filter((x): x is string => !!x)));
  if (!ds || ids.length === 0) return new Map();
  try {
    const rows: Array<{
      id: string;
      name: string;
      regulatory_type: string | null;
      drug_category: string | null;
      manufacturer_name: string | null;
    }> = await ds.query(
      `SELECT id, name, regulatory_type, drug_category, manufacturer_name
       FROM product_masters WHERE id = ANY($1)`,
      [ids],
    );
    return new Map(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          name: r.name,
          regulatoryType: r.regulatory_type,
          drugCategory: r.drug_category,
          manufacturerName: r.manufacturer_name,
        },
      ]),
    );
  } catch (error) {
    console.error('buildProductRefMap error (product display degraded):', error);
    return new Map();
  }
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

function validFundingFields(input: any): boolean {
  if (!input.fundingStartAt || !input.fundingEndAt) return false;
  if (['oneLiner', 'videoUrl'].some(key => input[key] != null && (typeof input[key] !== 'string' || input[key].length > (key === 'oneLiner' ? 120 : 500)))) return false;
  const start = new Date(input.fundingStartAt).getTime(), end = new Date(input.fundingEndAt).getTime();
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 255 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  if (!Number.isInteger(Number(input.trialPeriodDays)) || Number(input.trialPeriodDays) < 1 || Number(input.trialPeriodDays) > 3650) return false;
  if (input.maxParticipants != null && (!Number.isInteger(Number(input.maxParticipants)) || Number(input.maxParticipants) < 1)) return false;
  return ['targetAmount', 'trialUnitPrice', 'rewardRate'].every(key => input[key] == null || Number.isFinite(Number(input[key])) && Number(input[key]) >= 0);
}
