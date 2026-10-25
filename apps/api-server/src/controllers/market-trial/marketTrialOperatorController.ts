import { readFundingParticipantActivity } from '../../services/funding/funding-participant-activity.service.js';
/**
 * Market Trial Operator Controller
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1
 * WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
 * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
 *
 * Handles:
 * - Neture operator 1st approval (SUBMITTED → RECRUITING)
 * - Participant reward-status management (pending ↔ fulfilled)
 * - Trial status transitions (RECRUITING → DEVELOPMENT → ... → FULFILLED → CLOSED)
 * - Offline payment confirmation records with transactional audit
 * - Operator trial listing (all trials / service-scoped)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { DataSource, Repository, IsNull } from 'typeorm';
import {
  MarketTrial,
  TrialStatus,
  MarketTrialForum,
  calculateAchievementRate,
  calculateParticipationRate,
  calculatePaymentCompletionRate,
  calculateRecruitingRemainingDays,
  calculateRecruitingProgressPercent,
} from '@o4o/market-trial';
import {
  MarketTrialForumSyncFailure,
  type ForumSyncStage,
  type ForumSyncSeverity,
} from '../../extensions/trial-forum-monitor/entities/MarketTrialForumSyncFailure.entity.js';
import { marketTrialNotification } from '../../services/marketTrial.notification.js';
import logger from '../../utils/logger.js';
import type { RequestHandler } from 'express';
import { hasFundingOperator } from '../../services/funding/funding-access.js';
import { FundingWorkspaceService, FundingError } from '../../services/funding/funding-workspace.service.js';
import { fundingReview, fundingForumSlug, fundingForumCode, FUNDING_PROGRESS_TRANSITIONS } from '../../services/funding/funding-review.js';
import { participantFilters, participantCsvCell } from '../../services/funding/funding-participant-export.js';
import { FundingOperatorExceptionsService } from '../../services/funding/funding-operator-exceptions.service.js';
import { FundingRewardRecordService } from '../../services/funding/funding-reward-record.service.js';
import { FundingPaymentRecordService } from '../../services/funding/funding-payment-record.service.js';
import { forumFailureFilters, isForumFailureId } from '../../services/funding/funding-forum-failure-filters.js';

// Valid participant reward status values
const VALID_REWARD_STATUSES = ['pending', 'fulfilled'] as const;
type RewardStatus = typeof VALID_REWARD_STATUSES[number];

// WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: 제품 전환/고객 전환 상태 상수 제거 (content-only).

export class MarketTrialOperatorController {
  private static dataSource: DataSource | null = null;
  private static trialRepo: Repository<MarketTrial>;
  private static forumRepo: Repository<MarketTrialForum>;
  private static forumSyncFailureRepo: Repository<MarketTrialForumSyncFailure>;
  static setDataSource(ds: DataSource) {
    this.dataSource = ds;
    this.trialRepo = ds.getRepository(MarketTrial);
    this.forumRepo = ds.getRepository(MarketTrialForum);
    this.forumSyncFailureRepo = ds.getRepository(MarketTrialForumSyncFailure);
  }

  // ============================================================================
  // Internal: 포럼 연계 실패 기록 헬퍼
  // ============================================================================

  private static async recordForumSyncFailure(
    trial: Pick<MarketTrial, 'id' | 'title'>,
    stage: ForumSyncStage,
    severity: ForumSyncSeverity,
    error: unknown,
  ): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    const logPayload = {
      event: 'market_trial.forum_sync_failure',
      trialId: trial.id,
      trialTitle: trial.title,
      stage,
      severity,
      errorMessage: err.message,
    };
    console.error(JSON.stringify(logPayload));

    try {
      const record = this.forumSyncFailureRepo.create({
        trialId: trial.id,
        trialTitle: trial.title,
        stage,
        severity,
        errorMessage: err.message,
        errorStack: err.stack ?? null,
        resolvedAt: null,
        resolutionNote: null,
      });
      await this.forumSyncFailureRepo.save(record);
    } catch (saveErr) {
      // 실패 기록 저장 자체가 실패해도 주 흐름에 영향 없음
      logger.error('[MarketTrial] Failed to save forum sync failure record:', saveErr);
    }
  }

  private static async resolveForumFailures(trialId: string): Promise<void> {
    try {
      await this.forumSyncFailureRepo.createQueryBuilder().update(MarketTrialForumSyncFailure)
        .set({ resolvedAt: new Date(), resolutionNote: '전용 포럼 개설 완료' }).where('trial_id = :trialId AND resolved_at IS NULL', { trialId }).execute();
    } catch (error) { logger.error('[Funding] failed to resolve historical forum failure records', error); }
  }

  /** Recheck the current DB role after the existing service membership gate. */
  static readonly requireCurrentOperator: RequestHandler = (req, res, next) => {
    const ds = MarketTrialOperatorController.dataSource;
    if (!ds || !(req as any).user?.id) { res.status(403).json({ success: false, message: '운영 권한이 없습니다.' }); return; }
    void hasFundingOperator(ds, (req as any).user.id).then(allowed => {
      if (allowed) next();
      else res.status(403).json({ success: false, message: '현재 펀딩 운영 권한이 없습니다.' });
    }).catch(next);
  };

  // ============================================================================
  // Neture Operator 1st Approval
  // ============================================================================

  /**
   * GET /api/v1/neture/operator/market-trial
   * 전체 Trial 목록 (관리용)
   */
  static async listExceptions(req: AuthRequest, res: Response) {
    try {
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) throw new Error('DataSource unavailable');
      const data = await new FundingOperatorExceptionsService(ds).list(req.query);
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      return res.status(500).json({ success: false, message: '예외 현황을 조회하지 못했습니다.' });
    }
  }
  static async participantHistory(req: AuthRequest, res: Response) {
    try {
      if (![req.params.id, req.params.participantId].every(id => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))) throw new FundingError(400, 'INVALID_PARTICIPANT_ID', '대상 정보를 확인해 주세요.');
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) throw new Error('DataSource unavailable');
      const data = await new FundingOperatorExceptionsService(ds).history(req.params.id, req.params.participantId);
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      return res.status(500).json({ success: false, message: '처리 이력을 조회하지 못했습니다.' });
    }
  }

  static async listAll(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const qb = MarketTrialOperatorController.trialRepo.createQueryBuilder('trial');

      if (status && typeof status === 'string') {
        qb.andWhere('trial.status = :status', { status });
      }

      qb.orderBy('trial.createdAt', 'DESC');
      const trials = await qb.getMany();

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 batch 조회
      const productMap = await buildOperatorProductRefMap(
        MarketTrialOperatorController.dataSource,
        trials.map((t) => t.productId),
      );

      res.json({
        success: true,
        data: trials.map((t) => toOperatorTrialDTO(t, productMap.get(t.productId ?? ''))),
      });
    } catch (error) {
      console.error('Operator list trials error:', error);
      res.status(500).json({ success: false, message: 'Failed to list trials' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/kpi
   * WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1:
   *   Lightweight aggregate snapshot for the operator dashboard.
   *
   * Status semantics (per WO §6):
   *   successfulTrials = closeReason='auto_target_reached'
   *                      OR status IN (development, outcome_confirming, fulfilled)
   *   failedTrials     = closeReason='auto_target_missed'
   *   closedTrials     = status='closed' (post-recruit, regardless of outcome)
   *   successRate      = successfulTrials / (successfulTrials + failedTrials)
   *
   * Payment analytics (per WO §7) — payment lifecycle only, settlement excluded.
   *
   * All counts are SQL aggregates (single round-trip, no N+1).
   * No new index is required — existing (status), (status, fundingEndAt),
   * and (marketTrialId, paymentStatus) indexes cover the queries.
   */
  static async getKpi(req: AuthRequest, res: Response) {
    try {
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }
      const data = await computeKpiSnapshot(ds, { supplierId: null });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Operator KPI error:', error);
      res.status(500).json({ success: false, message: 'Failed to compute KPI' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/:id/kpi
   * Per-trial operational KPI for the operator detail screen.
   * Returned separately from /:id (detail) so the detail call stays light.
   */
  static async getTrialKpi(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }
      const data = await computeTrialKpi(ds, trial);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Operator trial KPI error:', error);
      res.status(500).json({ success: false, message: 'Failed to compute trial KPI' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/:id
   * Trial 상세
   */
  static async getDetail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      // WO-MARKET-TRIAL-KPA-FORUM-INTEGRATION-V1: 연결된 KPA 포럼 게시글 정보
      const forumMapping = await MarketTrialOperatorController.forumRepo.findOne({
        where: { marketTrialId: id },
      });
      let forumLink: { forumPostId?: string; forumId?: string; slug: string | null; url: string } | null = null;
      if (forumMapping && MarketTrialOperatorController.dataSource) {
        const rows = await MarketTrialOperatorController.dataSource.query(
          `SELECT slug FROM forum_post WHERE id = $1`,
          [forumMapping.forumId],
        );
        if (rows.length > 0) {
          forumLink = {
            forumPostId: forumMapping.forumId,
            slug: rows[0].slug,
            // KPA-a forum post route: /forum/post/:slug
            url: `/forum/post/${rows[0].slug}`,
          };
        }
      }

      const [workspaceForum] = await MarketTrialOperatorController.dataSource!.query(
        "SELECT id, slug FROM forum_category_requests WHERE slug = $1 AND service_code = $2 AND status = 'completed' LIMIT 1", [fundingForumSlug(id), fundingForumCode(id)]);
      if (workspaceForum) forumLink = { forumId: workspaceForum.id, slug: workspaceForum.slug, url: `/market-trial/${id}/forum` };

      // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 조회
      const productMap = await buildOperatorProductRefMap(
        MarketTrialOperatorController.dataSource,
        [trial.productId],
      );

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial, productMap.get(trial.productId ?? '')),
          forumLink,
          forumReady: !!workspaceForum,
        },
      });
    } catch (error) {
      console.error('Operator get trial detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to get trial detail' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/approve
   * WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1:
   * 네뚜레 운영자 단일 승인: 승인 이력 저장 → 전용 포럼 개설 → RECRUITING
   */
  static async approve1st(req: AuthRequest, res: Response) {
    try {
      const actor = req.user!.id;
      const service = new FundingWorkspaceService(MarketTrialOperatorController.dataSource!);
      let trial = await service.review(req.params.id, actor, true);
      try {
        trial = (await service.ensureForum(trial.id, actor)).trial;
        await MarketTrialOperatorController.resolveForumFailures(trial.id);
        void marketTrialNotification.onApproved(trial, actor);
      } catch (error) {
        await MarketTrialOperatorController.recordForumSyncFailure(trial, 'forum_post_create', 'critical', error);
      }
      res.json({ success: true, data: toOperatorTrialDTO(trial), message: fundingReview(trial).forumPending ? '승인되었습니다. 포럼 개설을 재처리해 주세요.' : '승인·포럼 개설 후 모집을 시작했습니다.' });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      logger.error('[Funding] approval failed', error);
      res.status(500).json({ success: false, message: '펀딩 승인에 실패했습니다.' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/reject
   * 심사 반려: SUBMITTED → DRAFT (사유를 보존하고 보완·재신청 허용)
   */
  static async reject1st(req: AuthRequest, res: Response) {
    try {
      const trial = await new FundingWorkspaceService(MarketTrialOperatorController.dataSource!).review(req.params.id, req.user!.id, false, req.body.reason);
      void marketTrialNotification.onRejected(trial, req.body.reason, req.user!.id);
      res.json({ success: true, data: toOperatorTrialDTO(trial), message: '반려했습니다. 개설자가 보완 후 다시 신청할 수 있습니다.' });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      logger.error('[Funding] rejection failed', error);
      res.status(500).json({ success: false, message: '반려에 실패했습니다.' });
    }
  }

  // ============================================================================
  // Participants
  // WO-MARKET-TRIAL-PARTICIPANT-EXPORT-V1
  // WO-MARKET-TRIAL-OPERATION-READINESS-V1: JSON participant list for inline display
  // ============================================================================

  /**
   * GET /api/v1/neture/operator/market-trial/:id/funnel
   * WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1:
   * 단일 Trial의 전체 퍼널 집계 (참여→관심→취급→주문→진열)
   */
  static async getFunnel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const ds = MarketTrialOperatorController.dataSource!;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      // WO-O4O-MARKET-TRIAL-CONVERSION-READ-WIRING-CLEANUP-V1:
      // content-only — 전환 퍼널(conversionDistribution)·매장 진열(listingCount)·제품 전환 read 제거.
      const rows: Array<{
        participantCount: number;
        productRewardCount: number;
      }> = await ds.query(
        `SELECT
           COUNT(p.id)::int                                            AS "participantCount",
           COUNT(p.id) FILTER (WHERE p."rewardType" = 'product')::int AS "productRewardCount"
         FROM market_trial_participants p
         WHERE p."marketTrialId" = $1 AND NOT COALESCE((p."offlineState"->>'withdrawn')::boolean,false)`,
        [id],
      );

      const r = rows[0] ?? {
        participantCount: 0, productRewardCount: 0,
      };
      res.json({
        success: true,
        data: {
          recruitCount: trial.maxParticipants ?? null,
          participantCount: r.participantCount ?? 0,
          productRewardCount: r.productRewardCount ?? 0,
        },
      });
    } catch (error) {
      console.error('Get trial funnel error:', error);
      res.status(500).json({ success: false, message: 'Failed to get trial funnel' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/:id/participants
   * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
   * 참여자 목록 JSON - 이행 요약 + 필터 지원
   *
   * Query params:
   *   rewardType=product|cash  (optional)
   *   rewardStatus=pending|fulfilled  (optional)
   */
  static async listParticipants(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      // Build filter conditions
      const conditions: string[] = [`p."marketTrialId" = $1`];
      const params: unknown[] = [id];
      conditions.push(...participantFilters(req.query, params));

      // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1: settlement filter support
      if (req.query.settlementStatus && typeof req.query.settlementStatus === 'string') {
        params.push(req.query.settlementStatus);
        conditions.push(`p."settlementStatus" = $${params.length}`);
      }

      const rows: Array<{
        id: string;
        participantName: string;
        withdrawn: boolean;
        participantType: string;
        rewardType: string | null;
        rewardStatus: string;
        organizationId: string | null;
        createdAt: Date;
        // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
        contributionAmount: string | null;
        settlementStatus: string;
        settlementChoice: string | null;
        settlementAmount: string | null;
        settlementProductQty: number | null;
        settlementRemainder: string | null;
        settlementNote: string | null;
        // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
        paymentStatus: string;
        paymentMethod: string | null;
        paymentProvider: string | null;
        paymentReference: string | null;
        paidAmount: string | null;
        paidAt: Date | null;
        confirmedAt: Date | null;
        paymentNote: string | null;
        updatedAt: Date;
      }> = await ds.query(
        `SELECT
           p.id,
           COALESCE(u.name, u.email, '알 수 없음') AS "participantName",
           COALESCE((p."offlineState"->>'withdrawn')::boolean,false) AS withdrawn,
           p."participantType",
           p."rewardType",
           p."rewardStatus",
           (SELECT om.organization_id FROM organization_members om
            WHERE om.user_id = p."participantId"
              AND om.role IN ('owner', 'admin', 'manager')
              AND om.left_at IS NULL
            LIMIT 1) AS "organizationId",
           p."createdAt",
           p."contributionAmount",
           COALESCE(p."settlementStatus", 'pending') AS "settlementStatus",
           p."settlementChoice",
           p."settlementAmount",
           p."settlementProductQty",
           p."settlementRemainder",
           p."settlementNote",
           COALESCE(p."paymentStatus", 'unpaid') AS "paymentStatus",
           p."paymentMethod",
           p."paymentProvider",
           p."paymentReference",
           p."paidAmount",
           p."paidAt",
           p."confirmedAt",
           p."paymentNote",
           p."updatedAt"
         FROM market_trial_participants p
         LEFT JOIN users u ON u.id = p."participantId"
         WHERE ${conditions.join(' AND ')}
         ORDER BY p."createdAt" DESC`,
        params,
      );

      const historyRows = await readFundingParticipantActivity(ds, id);
      const allRows = historyRows.filter(row => !row.withdrawn);

      const totalCount = allRows.length;
      const productCount = allRows.filter((r) => r.rewardType === 'product').length;
      const cashCount = allRows.filter((r) => r.rewardType === 'cash').length;
      const fulfilledCount = allRows.filter((r) => r.rewardStatus === 'fulfilled').length;
      const pendingCount = totalCount - fulfilledCount;
      const fulfillmentRate = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
      // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
      const settlementPendingCount = allRows.filter((r) => r.settlementStatus === 'pending').length;
      const choicePendingCount = allRows.filter((r) => r.settlementStatus === 'choice_pending').length;
      const choiceCompletedCount = allRows.filter((r) => r.settlementStatus === 'choice_completed').length;
      const offlineReviewCount = allRows.filter((r) => r.settlementStatus === 'offline_review').length;
      const offlineSettledCount = allRows.filter((r) => r.settlementStatus === 'offline_settled').length;

      // Also fetch trial's rewardRate for settlement calc display
      const trialRewardRate = Number(trial.rewardRate) || 0;
      const trialUnitPrice = trial.trialUnitPrice ? Number(trial.trialUnitPrice) : null;

      res.json({
        success: true,
        data: {
          summary: {
            recordCount: historyRows.length,
            withdrawnCount: historyRows.length - allRows.length,
            totalCount,
            productCount,
            cashCount,
            fulfilledCount,
            pendingCount,
            fulfillmentRate,
            // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
            settlementPendingCount,
            choicePendingCount,
            choiceCompletedCount,
            offlineReviewCount,
            offlineSettledCount,
          },
          participants: rows.map((r) => {
            const contribution = Number(r.contributionAmount) || 0;
            const totalSettlementAmount = Math.round(contribution * (1 + trialRewardRate / 100));
            let estimatedProductQty: number | null = null;
            let estimatedRemainder: number | null = null;
            if (trialUnitPrice && trialUnitPrice > 0) {
              estimatedProductQty = Math.floor(totalSettlementAmount / trialUnitPrice);
              estimatedRemainder = Math.round(totalSettlementAmount - estimatedProductQty * trialUnitPrice);
            }
            return {
              id: r.id,
              name: r.participantName,
              withdrawn: !!r.withdrawn,
              type: r.participantType,
              rewardType: r.rewardType,
              rewardStatus: r.rewardStatus,
              organizationId: r.organizationId || null,
              joinedAt: new Date(r.createdAt).toISOString(),
              // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
              contributionAmount: contribution,
              rewardRate: trialRewardRate,
              totalSettlementAmount,
              trialUnitPrice,
              estimatedProductQty,
              estimatedRemainder,
              settlementStatus: r.settlementStatus,
              settlementChoice: r.settlementChoice || null,
              settlementAmount: r.settlementAmount != null ? Number(r.settlementAmount) : null,
              settlementProductQty: r.settlementProductQty ?? null,
              settlementRemainder: r.settlementRemainder != null ? Number(r.settlementRemainder) : null,
              settlementNote: r.settlementNote || null,
              // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
              paymentStatus: r.paymentStatus,
              paymentMethod: r.paymentMethod || null,
              paymentProvider: r.paymentProvider || null,
              paymentReference: r.paymentReference || null,
              paidAmount: r.paidAmount != null ? Number(r.paidAmount) : null,
              paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
              confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : null,
              paymentNote: r.paymentNote || null,
              updatedAt: new Date(r.updatedAt).toISOString(),
            };
          }),
        },
      });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      console.error('Operator list participants error:', error);
      res.status(500).json({ success: false, message: 'Failed to list participants' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/participants/:participantId/reward-status
   * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
   * 참여자 이행 상태 변경 (pending ↔ fulfilled)
   */
  static async updateParticipantRewardStatus(req: AuthRequest, res: Response) {
    try {
      const { id, participantId } = req.params;
      const { rewardStatus } = req.body;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }

      if (!rewardStatus || !VALID_REWARD_STATUSES.includes(rewardStatus as RewardStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid rewardStatus. Must be one of: ${VALID_REWARD_STATUSES.join(', ')}`,
        });
      }

      // Verify trial exists
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const actorId = req.user?.id;
      if (!actorId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      const updated = await new FundingRewardRecordService(ds).update(id, participantId, actorId, rewardStatus);
      const result = [updated];

      res.json({
        success: true,
        data: {
          id: result[0].id,
          rewardType: result[0].rewardType,
          rewardStatus: result[0].rewardStatus,
        },
        message: `이행 상태가 "${rewardStatus === 'fulfilled' ? '이행 완료' : '대기'}"로 변경되었습니다.`,
      });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      console.error('Update participant reward status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update participant status' });
    }
  }

  /** Compatibility endpoint: new settlement mutations stay disabled; existing data is preserved. */
  static async updateParticipantSettlementStatus(_req: AuthRequest, res: Response) {
    return res.status(409).json({
      success: false,
      message: '유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다.',
      code: 'MARKET_TRIAL_SETTLEMENT_DISABLED',
    });
  }

  /** Offline confirmation records only; payment and audit commit together. */
  static async updateParticipantPaymentStatus(req: AuthRequest, res: Response) {
    try {
      const { id, participantId } = req.params;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) return res.status(404).json({ success: false, message: 'Trial not found' });
      const record = await new FundingPaymentRecordService(ds).update(id, participantId, req.user!.id, req.body ?? {});
      return res.json({ success: true, data: record, message: '오프라인 입금 기록을 저장했습니다.' });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      // Database errors can include raw reference/note values; keep them out of application logs.
      logger.error('[Funding] payment record transaction failed');
      return res.status(500).json({ success: false, message: '입금 기록 저장에 실패했습니다. 다시 확인해 주세요.' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/status
   * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
   * Trial 단위 상태 전환 (운영자 수동)
   * 허용 전환: RECRUITING → DEVELOPMENT → OUTCOME_CONFIRMING → FULFILLED → CLOSED
   */
  static async updateTrialStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status: newStatus } = req.body;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const allowedNextStatuses = FUNDING_PROGRESS_TRANSITIONS[trial.status as TrialStatus];
      if (!allowedNextStatuses || !allowedNextStatuses.includes(newStatus as TrialStatus)) {
        const allowed = allowedNextStatuses?.join(', ') || '없음';
        return res.status(400).json({
          success: false,
          message: `Cannot transition from "${trial.status}" to "${newStatus}". Allowed: ${allowed}`,
        });
      }

      const previousStatus = trial.status;
      const changed = await new FundingWorkspaceService(MarketTrialOperatorController.dataSource!).changeStatus(id, req.user!.id, newStatus as TrialStatus);
      Object.assign(trial, changed);

      // WO-NETURE-MARKET-TRIAL-NOTIFICATION-INTEGRATION-V1: lifecycle notifications on operator transition.
      // Idempotent at the call site — ALLOWED_TRIAL_TRANSITIONS check above blocks repeats.
      // Note: cron handles the typical RECRUITING → DEVELOPMENT/CLOSED path; this branch covers
      //       a rare operator-initiated early DEVELOPMENT (success-only — there's no manual recruiting_failed path).
      const actorId = (req as any).user?.id;
      if (previousStatus === TrialStatus.RECRUITING && newStatus === TrialStatus.DEVELOPMENT) {
        void marketTrialNotification.onRecruitingResult(trial.id, true, actorId);
      } else if (newStatus === TrialStatus.OUTCOME_CONFIRMING) {
        void marketTrialNotification.onOutcomeConfirming(trial.id, actorId);
      } else if (newStatus === TrialStatus.FULFILLED) {
        void marketTrialNotification.onFulfilled(trial.id, actorId);
      }

      res.json({
        success: true,
        data: toOperatorTrialDTO(trial),
        message: `Trial 상태가 "${newStatus}"로 변경되었습니다.`,
      });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      console.error('Update trial status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update trial status' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/:id/participants/export
   * Trial 참여자 목록 CSV 다운로드
   */
  static async exportParticipantsCSV(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const params: unknown[] = [id];
      const conditions = ['p."marketTrialId" = $1', ...participantFilters(req.query, params)];
      const rows: Array<{
        participantName: string;
        withdrawn: boolean;
        participantType: string;
        rewardType: string | null;
        rewardStatus: string;
        contributionAmount: string | number | null;
        paymentStatus: string | null;
        paidAmount: string | number | null;
        paidAt: Date | null;
        confirmedAt: Date | null;
        paymentReference: string | null;
        settlementChoice: string | null;
        settlementStatus: string | null;
        createdAt: Date;
      }> = await ds.query(
        `SELECT
           COALESCE(u.name, u.email, '알 수 없음') AS "participantName",
           COALESCE((p."offlineState"->>'withdrawn')::boolean,false) AS withdrawn,
           p."participantType",
           p."rewardType",
           p."rewardStatus",
           p."contributionAmount",
           p."paymentStatus",
           p."paidAmount",
           p."paidAt",
           p."confirmedAt",
           p."paymentReference",
           p."settlementChoice",
           p."settlementStatus",
           p."createdAt"
         FROM market_trial_participants p
         LEFT JOIN users u ON u.id = p."participantId"
         WHERE ${conditions.join(' AND ')}
         ORDER BY p."createdAt" DESC`,
        params,
      );

      // Human-readable label maps
      const rewardTypeLabel = (v: string | null) => {
        if (v === 'product') return '제품 보상';
        if (v === 'cash') return '현금 보상';
        return v || '-';
      };
      const rewardStatusLabel = (v: string) => {
        if (v === 'pending') return '대기';
        if (v === 'fulfilled') return '이행 완료';
        return v;
      };
      // WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1:
      // 'store_owner' = canonical, 'seller' = legacy fallback (기존 row 호환).
      // 사용자 화면 라벨은 두 값 모두 "매장 경영자" 로 통일.
      const participantTypeLabel = (v: string) => {
        if (v === 'store_owner' || v === 'seller') return '매장 경영자';
        return v; // (Legacy Partner 'partner' 라벨 은퇴 — 잔존 row 는 원문 표시)
      };
      const fmtDate = (d: Date) => {
        const dt = new Date(d);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const h = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
      };

      // WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1:
      // 오프라인 입금/정산 컬럼 보강 (송금 완료자 명단 공유용). 온라인 결제 아님.
      const paymentStatusLabel = (v: string | null) =>
        ({ unpaid: '입금 전', pending: '입금 확인 대기', paid: '입금 확인 완료', failed: '입금 확인 실패', canceled: '참여 취소', refunded: '환불 처리됨' } as Record<string, string>)[v || 'unpaid'] || v || '입금 전';
      // WO-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1: 사용자-facing 표기 '정산'→'펀딩 처리'(내부 enum 값/필드는 유지)
      const settlementStatusLabel = (v: string | null) =>
        ({ pending: '대기', choice_pending: '선택 대기', choice_completed: '선택 완료', offline_review: '운영 확인 중', offline_settled: '펀딩 처리 완료' } as Record<string, string>)[v || 'pending'] || v || '-';
      const settlementChoiceLabel = (v: string | null) => (v === 'product' ? '제품 수령' : v === 'cash' ? '금액 환급' : '-');
      const won = (n: string | number | null) => (n != null && n !== '' ? `${Number(n).toLocaleString()}원` : '-');

      // CSV header + rows
      const header = ['참여자명', '참여자유형', '보상방식', '보상상태', '참여금', '입금상태', '입금확인금액', '최초 입금 확인일', '마지막 확인일', '입금참조', '펀딩 처리 방식', '펀딩 처리 상태', '참여일', '유통참여형 펀딩 제목', '상태', '참여 상태'];
      const trialTitle = trial.title || '';
      const trialStatusLabel: Record<string, string> = {
        draft: '작성 중', submitted: '심사 대기',
        recruiting: '모집 중', development: '준비 중',
        outcome_confirming: '결과 확정', fulfilled: '이행 완료', closed: '종료',
      };
      const trialStatusText = trialStatusLabel[trial.status] || trial.status;

      const csvRows = rows.map((r) => [
        r.participantName, participantTypeLabel(r.participantType), rewardTypeLabel(r.rewardType),
        rewardStatusLabel(r.rewardStatus), won(r.contributionAmount), paymentStatusLabel(r.paymentStatus),
        won(r.paidAmount), r.paidAt ? fmtDate(r.paidAt) : '-', r.confirmedAt ? fmtDate(r.confirmedAt) : '-',
        r.paymentReference, settlementChoiceLabel(r.settlementChoice), settlementStatusLabel(r.settlementStatus),
        fmtDate(r.createdAt), trialTitle, trialStatusText, r.withdrawn ? '철회' : '참여 유지',
      ].map(participantCsvCell).join(','));

      // BOM for Excel UTF-8 compatibility
      const bom = '\uFEFF';
      const csv = bom + [header.join(','), ...csvRows].join('\n');

      // WO-…-SMOKE-DATA-FLOW: Content-Disposition 헤더는 ASCII 만 허용 — 한글 제목 시 ERR_INVALID_CHAR(500) 방지.
      // ascii fallback filename + RFC 5987 filename*(UTF-8) 으로 한글 파일명 제공.
      const asciiTitle = (trial.title || 'trial').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'trial';
      const filename = `market-trial-${asciiTitle}-participants.csv`;
      const utf8Filename = encodeURIComponent(`유통참여형펀딩-참여자-${(trial.title || '').slice(0, 30)}.csv`);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${utf8Filename}`);
      res.send(csv);
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      logger.error('[Funding] participant export failed');
      res.status(500).json({ success: false, message: 'Failed to export participants' });
    }
  }

  // ============================================================================
  // Trial → Product Conversion
  // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
  // ============================================================================

  // ============================================================================
  // WO-MONITOR-1: 포럼 연계 실패 조회 API
  // ============================================================================

  /**
   * POST /api/v1/neture/operator/market-trial/:id/forum-sync/retry
   * 포럼 공고 게시 재시도 (운영자 전용)
   *
   * WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1
   * - 라우터에서 funding scope guard + current DB role guard 가 이미 적용된다.
   *   공급자·일반 사용자는 이 경로에 도달할 수 없다.
   * - 멱등: 전용 포럼이 있으면 중복 생성하지 않고 already_linked 로 응답한다.
   * - 승인 전(SUBMITTED 이전) trial 은 공고 대상이 아니므로 거부한다.
   */
  static async retryForumSync(req: AuthRequest, res: Response) {
    try {
      const actor = req.user!.id;
      const service = new FundingWorkspaceService(MarketTrialOperatorController.dataSource!);
      const result = await service.ensureForum(req.params.id, actor);
      await MarketTrialOperatorController.resolveForumFailures(req.params.id);
      if (result.created) void marketTrialNotification.onApproved(result.trial, actor);
      return res.json({ success: true, data: { status: result.created ? 'created' : 'already_linked', forumId: result.forum.id } });
    } catch (error) {
      if (error instanceof FundingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id: req.params.id } });
      if (trial) await MarketTrialOperatorController.recordForumSyncFailure(trial, 'forum_post_create', 'critical', error);
      return res.status(502).json({ success: false, message: '포럼 개설에 실패했습니다. 다시 시도해 주세요.' });
    }
  }

  /**
   * GET /api/v1/neture/operator/market-trial/forum-sync-failures
   * 포럼 연계 실패 목록 (운영자 전용)
   * query: trialId?, resolved? (true|false), limit?, page?
   */
  static async listForumSyncFailures(req: AuthRequest, res: Response) {
    try {
      const filters = forumFailureFilters(req.query);
      if (!filters) return res.status(400).json({ success: false, message: '조회 조건을 확인해 주세요.' });
      const { trialId, resolved, limit, page, offset } = filters;

      const qb = MarketTrialOperatorController.forumSyncFailureRepo
        .createQueryBuilder('f')
        .orderBy('f.occurredAt', 'DESC')
        .addOrderBy('f.id', 'DESC')
        .take(limit)
        .skip(offset);

      if (trialId && typeof trialId === 'string') {
        qb.andWhere('f.trialId = :trialId', { trialId });
      }

      if (resolved === 'true') {
        qb.andWhere('f.resolvedAt IS NOT NULL');
      } else if (resolved === 'false') {
        qb.andWhere('f.resolvedAt IS NULL');
      }

      const [items, total] = await qb.getManyAndCount();

      res.json({
        success: true,
        data: items.map(toForumSyncFailureDTO),
        meta: { total, page, limit },
      });
    } catch (error) {
      console.error('listForumSyncFailures error:', error);
      res.status(500).json({ success: false, message: 'Failed to list forum sync failures' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/forum-sync-failures/:failureId/resolve
   * 실패 건 resolved 처리 (운영자 메모 저장 가능)
   */
  static async resolveForumSyncFailure(req: AuthRequest, res: Response) {
    try {
      const { failureId } = req.params;
      const { note } = req.body ?? {};
      if (!isForumFailureId(failureId) || (note != null && typeof note !== 'string')) {
        return res.status(400).json({ success: false, message: '해결 처리 입력을 확인해 주세요.' });
      }

      const record = await MarketTrialOperatorController.forumSyncFailureRepo.findOne({
        where: { id: failureId },
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'Failure record not found' });
      }

      if (record.resolvedAt) {
        return res.status(400).json({ success: false, message: 'Already resolved' });
      }

      const resolution = { resolvedAt: new Date(), resolutionNote: note ?? null };
      // Only the first resolver can write its memo, including concurrent retry/automatic recovery.
      const result = await MarketTrialOperatorController.forumSyncFailureRepo.update(
        { id: failureId, resolvedAt: IsNull() }, resolution,
      );
      if (result.affected !== 1) {
        return res.status(400).json({ success: false, message: 'Already resolved' });
      }
      Object.assign(record, resolution);

      res.json({ success: true, data: toForumSyncFailureDTO(record) });
    } catch (error) {
      console.error('resolveForumSyncFailure error:', error);
      res.status(500).json({ success: false, message: 'Failed to resolve failure record' });
    }
  }

}

// ============================================================================
// WO-MARKET-TRIAL-CONVERSION-NOTIFICATION-V1 — 제거됨
// WO-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1 (MF-2)
//
// Trial → Product 전환 알림 producer(dispatchConversionNotifications)를 삭제했다.
//   - 전환 기능 자체가 WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1(7b7b0d1fa)에서
//     content-only 모델로 은퇴하며 convert route·핸들러·컬럼이 제거됐고, 이 함수만
//     호출부 0개인 고아 코드로 남아 있었다 (저장소 전역 call site = 0).
//   - 이 함수는 `metadata.linkUrl = /hub/products/{id}` 를 기록하는 유일한 producer 였다.
//     `/hub/products/:id` 는 web-neture route tree 에 존재하지 않고(`/hub` 는 `/workspace/hub`
//     redirect 뿐), 공통 resolver(resolveNotificationTarget)는 `metadata.targetUrl` 만 읽으므로
//     `linkUrl` 은 애초에 이동을 발생시키지도 못했다.
//   - 프로덕션 실측(2026-08-20): 이 producer 가 만든 row = 0건
//     (metadata LIKE %/hub/% = 0, metadata ? linkUrl = 0, trialId+productId = 0).
//   - 따라서 유효 destination 을 새로 만들지 않고(§13·§14 신규 route/page 금지) producer 를
//     제거하는 것이 DEAD_ROUTE 를 닫는 최소 교정이다. resolver 에 linkUrl fallback 을 추가하는
//     방식(= producer 결함 은폐)은 §17 위반이므로 채택하지 않았다.
// ============================================================================

// ============================================================================
// DTO converters
// ============================================================================

function toForumSyncFailureDTO(f: MarketTrialForumSyncFailure) {
  return {
    id: f.id,
    trialId: f.trialId,
    trialTitle: f.trialTitle,
    stage: f.stage,
    severity: f.severity,
    errorMessage: f.errorMessage,
    // errorStack은 API 응답에 노출하지 않음 (내부 저장 전용)
    occurredAt: new Date(f.occurredAt).toISOString(),
    resolvedAt: f.resolvedAt ? new Date(f.resolvedAt).toISOString() : null,
    resolutionNote: f.resolutionNote,
  };
}

/**
 * WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2:
 * 연결 제품(ProductMaster) 표시용 요약 (표시 전용 — 가격/재고 미포함).
 */
interface OperatorTrialProductRef {
  id: string;
  name: string;
  regulatoryType: string | null;
  drugCategory: string | null;
  manufacturerName: string | null;
}

/**
 * productId(soft 참조) → ProductMaster 요약 batch 조회.
 * Raw SQL + parameter binding. 실패/부재는 표시 누락으로만 degrade.
 */
async function buildOperatorProductRefMap(
  ds: DataSource | null,
  productIds: Array<string | null | undefined>,
): Promise<Map<string, OperatorTrialProductRef>> {
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
    console.error('buildOperatorProductRefMap error (product display degraded):', error);
    return new Map();
  }
}

function toOperatorTrialDTO(trial: MarketTrial, productRef?: OperatorTrialProductRef | null) {
  return {
    id: trial.id,
    ...fundingReview(trial),
    title: trial.title,
    description: trial.description,
    supplierId: trial.supplierId,
    supplierName: trial.supplierName || undefined,
    status: trial.status,
    outcomeSnapshot: trial.outcomeSnapshot,
    eligibleRoles: trial.eligibleRoles,
    rewardOptions: trial.rewardOptions,
    maxParticipants: trial.maxParticipants || undefined,
    currentParticipants: trial.currentParticipants,
    startDate: trial.fundingStartAt ? new Date(trial.fundingStartAt).toISOString() : undefined,
    endDate: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    trialPeriodDays: trial.trialPeriodDays,
    // WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 (표시 전용)
    productId: trial.productId || null,
    product: productRef || null,
    createdAt: new Date(trial.createdAt).toISOString(),
    updatedAt: new Date(trial.updatedAt).toISOString(),
  };
}

// ============================================================================
// WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1: KPI aggregation helpers
// ============================================================================

export interface MarketTrialKpiSnapshot {
  totalTrials: number;
  recruitingTrials: number;
  developmentTrials: number;
  outcomeConfirmingTrials: number;
  fulfilledTrials: number;
  closedTrials: number;
  successfulTrials: number;
  failedTrials: number;
  successRate: number | null;
  totalParticipants: number;
  totalRecruitingAmount: number;
  totalPaidAmount: number;
  paidParticipantCount: number;
  refundCount: number;
  paymentCompletionRate: number | null;
  averageAchievementRate: number | null;
}

/**
 * Compute the operator/supplier KPI snapshot in two SQL aggregates.
 * Pass supplierId=null for the operator-wide view, or a uuid to scope the
 * counts to one supplier (used by the supplier dashboard).
 */
async function computeKpiSnapshot(
  ds: DataSource,
  opts: { supplierId: string | null },
): Promise<MarketTrialKpiSnapshot> {
  const where = opts.supplierId ? `WHERE "supplierId" = $1` : '';
  const params = opts.supplierId ? [opts.supplierId] : [];

  // Trial-level aggregate — single round-trip, indexed scan on (status), (supplierId).
  const trialAgg: Array<{
    total: number;
    recruiting: number;
    development: number;
    outcome_confirming: number;
    fulfilled: number;
    closed: number;
    successful: number;
    failed: number;
    total_participants: number;
    total_recruiting_amount: string;
    avg_achievement_rate: string | null;
  }> = await ds.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'recruiting')::int AS recruiting,
       COUNT(*) FILTER (WHERE status = 'development')::int AS development,
       COUNT(*) FILTER (WHERE status = 'outcome_confirming')::int AS outcome_confirming,
       COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS fulfilled,
       COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
       COUNT(*) FILTER (
         WHERE status IN ('development', 'outcome_confirming', 'fulfilled')
            OR "closeReason" = 'auto_target_reached'
            OR "offlineState"->>'decision' = 'met'
       )::int AS successful,
       COUNT(*) FILTER (WHERE "closeReason" IN ('auto_target_missed','operator_target_missed'))::int AS failed,
       COALESCE(SUM("currentParticipants"), 0)::int AS total_participants,
       COALESCE(SUM(COALESCE(ledger.net_amount,0)), 0)::numeric AS total_recruiting_amount,
       AVG(
         CASE WHEN "targetAmount" > 0
              THEN (COALESCE(ledger.net_amount,0) / "targetAmount") * 100
              ELSE NULL
         END
       )::numeric AS avg_achievement_rate
     FROM market_trials
     LEFT JOIN (
       SELECT "marketTrialId", SUM(GREATEST(COALESCE("paidAmount",0)-COALESCE(("offlineState"->>'refundAmount')::numeric,0),0)) AS net_amount
       FROM market_trial_participants WHERE "paymentStatus"='paid' GROUP BY "marketTrialId"
     ) ledger ON ledger."marketTrialId"=market_trials.id
     ${where}`,
    params,
  );

  // Participant-level aggregate — joined to market_trials only when scoping by supplier.
  const participantAgg: Array<{
    total_paid_amount: string;
    paid_count: number;
    refund_count: number;
    participant_total: number;
  }> = opts.supplierId
    ? await ds.query(
        `SELECT
           COALESCE(SUM(p."paidAmount"), 0)::numeric AS total_paid_amount,
           COUNT(*) FILTER (WHERE p."paymentStatus" = 'paid')::int AS paid_count,
           COUNT(*) FILTER (WHERE p."paymentStatus" = 'refunded')::int AS refund_count,
           COUNT(*)::int AS participant_total
         FROM market_trial_participants p
         INNER JOIN market_trials t ON t.id = p."marketTrialId"
         WHERE t."supplierId" = $1`,
        [opts.supplierId],
      )
    : await ds.query(
        `SELECT
           COALESCE(SUM("paidAmount"), 0)::numeric AS total_paid_amount,
           COUNT(*) FILTER (WHERE "paymentStatus" = 'paid')::int AS paid_count,
           COUNT(*) FILTER (WHERE "paymentStatus" = 'refunded')::int AS refund_count,
           COUNT(*)::int AS participant_total
         FROM market_trial_participants`,
      );

  const t = trialAgg[0];
  const p = participantAgg[0];

  const successful = Number(t?.successful ?? 0);
  const failed = Number(t?.failed ?? 0);
  const successDenom = successful + failed;
  const successRate = successDenom > 0
    ? Math.round((successful / successDenom) * 1000) / 10
    : null;

  const avgRaw = t?.avg_achievement_rate;
  const avgAch = avgRaw == null ? null : Math.round(Number(avgRaw) * 10) / 10;

  const paidCount = Number(p?.paid_count ?? 0);
  const participantTotal = Number(p?.participant_total ?? 0);
  const paymentCompletionRate = calculatePaymentCompletionRate(paidCount, participantTotal);

  return {
    totalTrials: Number(t?.total ?? 0),
    recruitingTrials: Number(t?.recruiting ?? 0),
    developmentTrials: Number(t?.development ?? 0),
    outcomeConfirmingTrials: Number(t?.outcome_confirming ?? 0),
    fulfilledTrials: Number(t?.fulfilled ?? 0),
    closedTrials: Number(t?.closed ?? 0),
    successfulTrials: successful,
    failedTrials: failed,
    successRate,
    totalParticipants: Number(t?.total_participants ?? 0),
    totalRecruitingAmount: Number(t?.total_recruiting_amount ?? 0),
    totalPaidAmount: Number(p?.total_paid_amount ?? 0),
    paidParticipantCount: paidCount,
    refundCount: Number(p?.refund_count ?? 0),
    paymentCompletionRate,
    averageAchievementRate: avgAch,
  };
}

export interface MarketTrialDetailKpi {
  trialId: string;
  status: string;
  achievementRate: number | null;
  participationRate: number | null;
  participantCount: number;
  paidParticipantCount: number;
  unpaidParticipantCount: number;
  failedPaymentCount: number;
  refundCount: number;
  paymentCompletionRate: number | null;
  totalPaidAmount: number;
  recruitingRemainingDays: number | null;
  recruitingProgressPercent: number | null;
  closeReason: string | null;
}

/**
 * Per-trial KPI: combines the trial's denormalized counters with one
 * participant-level aggregate. Used by /:id/kpi.
 */
async function computeTrialKpi(
  ds: DataSource,
  trial: MarketTrial,
): Promise<MarketTrialDetailKpi> {
  const rows: Array<{
    total: number;
    paid: number;
    unpaid: number;
    failed: number;
    refunded: number;
    paid_amount: string;
    net_amount: string;
  }> = await ds.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE "paymentStatus" = 'paid')::int AS paid,
       COUNT(*) FILTER (WHERE "paymentStatus" = 'unpaid')::int AS unpaid,
       COUNT(*) FILTER (WHERE "paymentStatus" = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE "paymentStatus" = 'refunded')::int AS refunded,
       COALESCE(SUM("paidAmount"), 0)::numeric AS paid_amount,
       COALESCE(SUM(CASE WHEN "paymentStatus"='paid' THEN GREATEST(COALESCE("paidAmount",0)-COALESCE(("offlineState"->>'refundAmount')::numeric,0),0) ELSE 0 END),0)::numeric AS net_amount
     FROM market_trial_participants
     WHERE "marketTrialId" = $1`,
    [trial.id],
  );
  const r = rows[0] ?? { total: 0, paid: 0, unpaid: 0, failed: 0, refunded: 0, paid_amount: '0', net_amount: '0' };

  return {
    trialId: trial.id,
    status: trial.status,
    achievementRate: calculateAchievementRate(Number(r.net_amount ?? 0), trial.targetAmount),
    participationRate: calculateParticipationRate(trial.currentParticipants, trial.maxParticipants ?? null),
    participantCount: Number(r.total),
    paidParticipantCount: Number(r.paid),
    unpaidParticipantCount: Number(r.unpaid),
    failedPaymentCount: Number(r.failed),
    refundCount: Number(r.refunded),
    paymentCompletionRate: calculatePaymentCompletionRate(Number(r.paid), Number(r.total)),
    totalPaidAmount: Number(r.paid_amount),
    recruitingRemainingDays: calculateRecruitingRemainingDays(trial.fundingEndAt),
    recruitingProgressPercent: calculateRecruitingProgressPercent(trial.fundingStartAt, trial.fundingEndAt),
    closeReason: trial.closeReason ?? null,
  };
}

/** Re-exported for the supplier-side controller in marketTrialController.ts. */
export { computeKpiSnapshot, computeTrialKpi };

