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
 * - Trial → Product conversion (link existing or create new ProductMaster)
 * - Operator trial listing (all trials / service-scoped)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  TrialStatus,
  MarketTrialForum,
} from '@o4o/market-trial';
import {
  MarketTrialForumSyncFailure,
  type ForumSyncStage,
  type ForumSyncSeverity,
} from '../../extensions/trial-forum-monitor/entities/MarketTrialForumSyncFailure.entity.js';

// Allowed trial status transitions (operator-initiated)
const ALLOWED_TRIAL_TRANSITIONS: Partial<Record<TrialStatus, TrialStatus[]>> = {
  [TrialStatus.RECRUITING]: [TrialStatus.DEVELOPMENT],
  [TrialStatus.DEVELOPMENT]: [TrialStatus.OUTCOME_CONFIRMING],
  [TrialStatus.OUTCOME_CONFIRMING]: [TrialStatus.FULFILLED],
  [TrialStatus.FULFILLED]: [TrialStatus.CLOSED],
};

/**
 * WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
 * 운영자가 허용하는 participant settlementStatus 전이 규칙
 * pending → choice_pending: 수동 개방 (cascade 또는 개별 예외)
 * choice_completed → offline_review: 운영자 검토 시작
 * offline_review → offline_settled: 운영자 정산 완료
 * offline_settled: 변경 불가 (locked)
 */
const ALLOWED_SETTLEMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ['choice_pending'],
  choice_pending: [],
  choice_completed: ['offline_review'],
  offline_review: ['offline_settled'],
  offline_settled: [],
};

// Valid participant reward status values
const VALID_REWARD_STATUSES = ['pending', 'fulfilled'] as const;
type RewardStatus = typeof VALID_REWARD_STATUSES[number];

// Trial statuses eligible for product conversion
const CONVERSION_ELIGIBLE_STATUSES: TrialStatus[] = [TrialStatus.FULFILLED, TrialStatus.CLOSED];

// WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
const VALID_CUSTOMER_CONVERSION_STATUSES = ['none', 'interested', 'considering', 'adopted', 'first_order'] as const;
type CustomerConversionStatus = typeof VALID_CUSTOMER_CONVERSION_STATUSES[number];

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
      console.error('[MarketTrial] Failed to save forum sync failure record:', saveErr);
    }
  }

  // ============================================================================
  // Neture Operator 1st Approval
  // ============================================================================

  /**
   * GET /api/v1/neture/operator/market-trial
   * 전체 Trial 목록 (관리용)
   */
  static async listAll(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const qb = MarketTrialOperatorController.trialRepo.createQueryBuilder('trial');

      if (status && typeof status === 'string') {
        qb.andWhere('trial.status = :status', { status });
      }

      qb.orderBy('trial.createdAt', 'DESC');
      const trials = await qb.getMany();

      res.json({ success: true, data: trials.map(toOperatorTrialDTO) });
    } catch (error) {
      console.error('Operator list trials error:', error);
      res.status(500).json({ success: false, message: 'Failed to list trials' });
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
      let forumLink: { forumPostId: string; slug: string | null; url: string } | null = null;
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

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial),
          forumLink,
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
   * 네뚜레 운영자 단일 승인: SUBMITTED → RECRUITING (서비스별 2차 승인 제거)
   */
  static async approve1st(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }
      if (trial.status !== TrialStatus.SUBMITTED) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: trial status is "${trial.status}", expected "submitted"`,
        });
      }

      // 단일 승인: SUBMITTED → RECRUITING (서비스별 2차 승인 없이 바로 모집 시작)
      trial.status = TrialStatus.RECRUITING;
      await MarketTrialOperatorController.trialRepo.save(trial);

      // WO-MARKET-TRIAL-KPA-FORUM-INTEGRATION-V1:
      // KPA-a Market Trial 포럼 카테고리에 자동 게시글 생성 + 매핑 저장
      // WO-MONITOR-1: 단계별 실패를 market_trial_forum_sync_failures에 기록
      const existingForum = await MarketTrialOperatorController.forumRepo.findOne({
        where: { marketTrialId: trial.id },
      });
      if (!existingForum && MarketTrialOperatorController.dataSource) {
        try {
          const ds = MarketTrialOperatorController.dataSource;
          const TRIAL_FORUM_CATEGORY_ID = 'f0000000-0a00-4000-f000-0000000000f1';

          // Stage 1: 카테고리 존재 확인
          let catExists: Array<{ id: string }>;
          try {
            catExists = await ds.query(
              `SELECT id FROM forum_category WHERE id = $1`,
              [TRIAL_FORUM_CATEGORY_ID],
            );
          } catch (catErr) {
            await MarketTrialOperatorController.recordForumSyncFailure(
              trial, 'category_check', 'warning', catErr,
            );
            catExists = [];
          }

          if (catExists.length > 0) {
            const slug = `market-trial-${trial.id.slice(0, 8)}-${Date.now().toString(36)}`;
            const excerpt = (trial.description || '').slice(0, 200);
            const content = JSON.stringify([
              { type: 'paragraph', data: { text: `[시범판매 모집] ${trial.title}` } },
              { type: 'paragraph', data: { text: trial.description || '' } },
              { type: 'paragraph', data: { text: `공급자: ${trial.supplierName || '-'}` } },
              { type: 'paragraph', data: { text: `상태: 모집 중 (RECRUITING)` } },
              { type: 'paragraph', data: { text: `※ 본 게시글은 운영자 승인으로 자동 생성되었습니다.` } },
            ]);

            // Stage 2: 포럼 게시글 INSERT
            let forumPostId: string | null = null;
            try {
              const inserted = await ds.query(
                `INSERT INTO forum_post (
                  "id", "title", "slug", "content", "excerpt",
                  "type", "status", "categoryId", "author_id",
                  "isPinned", "isLocked", "allowComments",
                  "viewCount", "commentCount", "likeCount",
                  "published_at", "created_at", "updated_at"
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4,
                  'announcement', 'publish', $5, NULL,
                  false, false, true,
                  0, 0, 0,
                  NOW(), NOW(), NOW()
                ) RETURNING id`,
                [
                  `[시범판매] ${trial.title}`,
                  slug,
                  content,
                  excerpt,
                  TRIAL_FORUM_CATEGORY_ID,
                ],
              );
              forumPostId = inserted[0]?.id ?? null;
            } catch (postErr) {
              await MarketTrialOperatorController.recordForumSyncFailure(
                trial, 'forum_post_create', 'critical', postErr,
              );
            }

            // Stage 3: 매핑 저장
            if (forumPostId) {
              try {
                const forumMapping = MarketTrialOperatorController.forumRepo.create({
                  marketTrialId: trial.id,
                  forumId: forumPostId,
                });
                await MarketTrialOperatorController.forumRepo.save(forumMapping);
              } catch (mappingErr) {
                await MarketTrialOperatorController.recordForumSyncFailure(
                  trial, 'forum_mapping_save', 'critical', mappingErr,
                );
              }
            }
          }
        } catch (forumError) {
          // 예상 외 에러 — 전체 블록 실패
          await MarketTrialOperatorController.recordForumSyncFailure(
            trial, 'forum_post_create', 'critical', forumError,
          );
        }
      }

      res.json({
        success: true,
        data: toOperatorTrialDTO(trial),
        message: 'Trial approved. Now recruiting.',
      });
    } catch (error) {
      console.error('Operator approve error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve trial' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/reject
   * 1차 반려: SUBMITTED → CLOSED
   */
  static async reject1st(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }
      if (trial.status !== TrialStatus.SUBMITTED) {
        return res.status(400).json({
          success: false,
          message: `Cannot reject: trial status is "${trial.status}", expected "submitted"`,
        });
      }

      trial.status = TrialStatus.CLOSED;
      await MarketTrialOperatorController.trialRepo.save(trial);

      res.json({
        success: true,
        data: toOperatorTrialDTO(trial),
        message: reason ? `Trial rejected: ${reason}` : 'Trial rejected',
      });
    } catch (error) {
      console.error('Operator reject 1st error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject trial' });
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

      const rows: Array<{
        participantCount: number;
        productRewardCount: number;
        convNone: number;
        convInterested: number;
        convConsidering: number;
        convAdopted: number;
        convFirstOrder: number;
        listingCount: number;
      }> = await ds.query(
        `SELECT
           COUNT(p.id)::int                                                            AS "participantCount",
           COUNT(p.id) FILTER (WHERE p."rewardType" = 'product')::int                 AS "productRewardCount",
           COUNT(p.id) FILTER (WHERE COALESCE(p."customerConversionStatus",'none') = 'none')::int AS "convNone",
           COUNT(p.id) FILTER (WHERE p."customerConversionStatus" = 'interested')::int  AS "convInterested",
           COUNT(p.id) FILTER (WHERE p."customerConversionStatus" = 'considering')::int AS "convConsidering",
           COUNT(p.id) FILTER (WHERE p."customerConversionStatus" = 'adopted')::int     AS "convAdopted",
           COUNT(p.id) FILTER (WHERE p."customerConversionStatus" = 'first_order')::int AS "convFirstOrder",
           (SELECT COUNT(*)::int FROM organization_product_listings opl
            WHERE opl.source_type = 'market_trial' AND opl.source_id = $1)             AS "listingCount"
         FROM market_trial_participants p
         WHERE p."marketTrialId" = $1`,
        [id],
      );

      const r = rows[0] ?? {
        participantCount: 0, productRewardCount: 0,
        convNone: 0, convInterested: 0, convConsidering: 0,
        convAdopted: 0, convFirstOrder: 0, listingCount: 0,
      };
      res.json({
        success: true,
        data: {
          recruitCount: trial.maxParticipants ?? null,
          participantCount: r.participantCount ?? 0,
          productRewardCount: r.productRewardCount ?? 0,
          convertedProduct: !!trial.convertedProductId,
          convertedProductId: trial.convertedProductId || null,
          convertedProductName: trial.convertedProductName || null,
          conversionDistribution: {
            none:        r.convNone        ?? 0,
            interested:  r.convInterested  ?? 0,
            considering: r.convConsidering ?? 0,
            adopted:     r.convAdopted     ?? 0,
            first_order: r.convFirstOrder  ?? 0,
          },
          listingCount:    r.listingCount     ?? 0,
          firstOrderCount: r.convFirstOrder   ?? 0,
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
      const { rewardType, rewardStatus, customerConversionStatus } = req.query;
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
      if (rewardType && typeof rewardType === 'string' && ['product', 'cash'].includes(rewardType)) {
        params.push(rewardType);
        conditions.push(`p."rewardType" = $${params.length}`);
      }
      if (rewardStatus && typeof rewardStatus === 'string' && VALID_REWARD_STATUSES.includes(rewardStatus as RewardStatus)) {
        params.push(rewardStatus);
        conditions.push(`p."rewardStatus" = $${params.length}`);
      }
      if (customerConversionStatus && typeof customerConversionStatus === 'string'
        && VALID_CUSTOMER_CONVERSION_STATUSES.includes(customerConversionStatus as CustomerConversionStatus)) {
        params.push(customerConversionStatus);
        conditions.push(`COALESCE(p."customerConversionStatus", 'none') = $${params.length}`);
      }

      // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1: settlement filter support
      if (req.query.settlementStatus && typeof req.query.settlementStatus === 'string') {
        params.push(req.query.settlementStatus);
        conditions.push(`p."settlementStatus" = $${params.length}`);
      }

      const rows: Array<{
        id: string;
        participantName: string;
        participantType: string;
        rewardType: string | null;
        rewardStatus: string;
        customerConversionStatus: string;
        customerConversionAt: Date | null;
        customerConversionNote: string | null;
        listingId: string | null;
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
        updatedAt: Date;
      }> = await ds.query(
        `SELECT
           p.id,
           COALESCE(u.name, u.email, '알 수 없음') AS "participantName",
           p."participantType",
           p."rewardType",
           p."rewardStatus",
           COALESCE(p."customerConversionStatus", 'none') AS "customerConversionStatus",
           p."customerConversionAt",
           p."customerConversionNote",
           p."listingId",
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
           p."updatedAt"
         FROM market_trial_participants p
         LEFT JOIN users u ON u.id = p."participantId"
         WHERE ${conditions.join(' AND ')}
         ORDER BY p."createdAt" DESC`,
        params,
      );

      // Full count (without filters) for summary — fetch settlement status counts too
      const allRows: Array<{ rewardType: string | null; rewardStatus: string; settlementStatus: string }> = await ds.query(
        `SELECT p."rewardType", p."rewardStatus", COALESCE(p."settlementStatus", 'pending') AS "settlementStatus"
         FROM market_trial_participants p
         WHERE p."marketTrialId" = $1`,
        [id],
      );

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
              type: r.participantType,
              rewardType: r.rewardType,
              rewardStatus: r.rewardStatus,
              customerConversionStatus: r.customerConversionStatus,
              customerConversionAt: r.customerConversionAt ? new Date(r.customerConversionAt).toISOString() : null,
              customerConversionNote: r.customerConversionNote || null,
              listingId: r.listingId || null,
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
              updatedAt: new Date(r.updatedAt).toISOString(),
            };
          }),
        },
      });
    } catch (error) {
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

      // Update participant rewardStatus
      const result = await ds.query(
        `UPDATE market_trial_participants
         SET "rewardStatus" = $1
         WHERE id = $2 AND "marketTrialId" = $3
         RETURNING id, "rewardType", "rewardStatus", "createdAt"`,
        [rewardStatus, participantId, id],
      );

      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: 'Participant not found for this trial' });
      }

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
      console.error('Update participant reward status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update participant status' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/participants/:participantId/settlement-status
   * WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1:
   * 운영자 participant 정산 상태 변경
   * Body: { settlementStatus, settlementNote? }
   * 허용 전이: pending→choice_pending, choice_completed→offline_review, offline_review→offline_settled
   */
  static async updateParticipantSettlementStatus(req: AuthRequest, res: Response) {
    try {
      const { id, participantId } = req.params;
      const { settlementStatus: newStatus, settlementNote } = req.body;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }

      if (!newStatus || typeof newStatus !== 'string') {
        return res.status(400).json({ success: false, message: 'settlementStatus is required' });
      }

      // Verify trial exists
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      // Fetch current participant status
      const rows: Array<{ id: string; settlementStatus: string }> = await ds.query(
        `SELECT id, COALESCE("settlementStatus", 'pending') AS "settlementStatus"
         FROM market_trial_participants
         WHERE id = $1 AND "marketTrialId" = $2`,
        [participantId, id],
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Participant not found for this trial' });
      }

      const currentStatus = rows[0].settlementStatus;
      const allowed = ALLOWED_SETTLEMENT_TRANSITIONS[currentStatus] ?? [];

      if (!allowed.includes(newStatus)) {
        const allowedStr = allowed.length > 0 ? allowed.join(', ') : '없음';
        return res.status(400).json({
          success: false,
          message: `"${currentStatus}" 상태에서 "${newStatus}"로 전이할 수 없습니다. 허용: ${allowedStr}`,
        });
      }

      // Build update query — include settlementNote if provided
      let sql: string;
      let sqlParams: unknown[];
      if (settlementNote !== undefined) {
        sql = `UPDATE market_trial_participants
               SET "settlementStatus" = $1, "settlementNote" = $2, "updatedAt" = now()
               WHERE id = $3 AND "marketTrialId" = $4
               RETURNING id, "settlementStatus", "settlementNote", "updatedAt"`;
        sqlParams = [newStatus, settlementNote, participantId, id];
      } else {
        sql = `UPDATE market_trial_participants
               SET "settlementStatus" = $1, "updatedAt" = now()
               WHERE id = $2 AND "marketTrialId" = $3
               RETURNING id, "settlementStatus", "settlementNote", "updatedAt"`;
        sqlParams = [newStatus, participantId, id];
      }

      const result = await ds.query(sql, sqlParams);
      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: 'Participant not found' });
      }

      const row = result[0];
      res.json({
        success: true,
        data: {
          id: row.id,
          settlementStatus: row.settlementStatus,
          settlementNote: row.settlementNote,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        },
        message: `정산 상태가 "${newStatus}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Update participant settlement status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settlement status' });
    }
  }

  /**
   * PATCH /api/v1/neture/operator/market-trial/:id/participants/:participantId/conversion
   * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1:
   * 참여자 고객 전환 단계 변경
   * Body: { status: CustomerConversionStatus, note?: string }
   */
  static async updateParticipantConversionStatus(req: AuthRequest, res: Response) {
    try {
      const { id, participantId } = req.params;
      const { status, note } = req.body;
      const ds = MarketTrialOperatorController.dataSource;
      if (!ds) {
        return res.status(500).json({ success: false, message: 'DataSource not initialized' });
      }

      if (!status || !VALID_CUSTOMER_CONVERSION_STATUSES.includes(status as CustomerConversionStatus)) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 전환 상태입니다. 허용값: ${VALID_CUSTOMER_CONVERSION_STATUSES.join(', ')}`,
        });
      }

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const result = await ds.query(
        `UPDATE market_trial_participants
         SET "customerConversionStatus" = $1,
             "customerConversionAt"     = NOW(),
             "customerConversionNote"   = COALESCE($2, "customerConversionNote")
         WHERE id = $3 AND "marketTrialId" = $4
         RETURNING id, "customerConversionStatus", "customerConversionAt", "customerConversionNote"`,
        [status, note || null, participantId, id],
      );

      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: 'Participant not found for this trial' });
      }

      const STAGE_LABELS: Record<string, string> = {
        none: '참여만',
        interested: '관심 있음',
        considering: '취급 검토 중',
        adopted: '취급 시작',
        first_order: '첫 주문 완료',
      };

      res.json({
        success: true,
        data: {
          id: result[0].id,
          customerConversionStatus: result[0].customerConversionStatus,
          customerConversionAt: result[0].customerConversionAt,
          customerConversionNote: result[0].customerConversionNote,
        },
        message: `전환 단계가 "${STAGE_LABELS[status] ?? status}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Update participant conversion status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update conversion status' });
    }
  }

  /**
   * POST /api/v1/neture/operator/market-trial/:id/participants/:participantId/listing
   * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1:
   * adopted 참여자의 매장에 Trial 상품을 진열 등록
   *
   * 전제: trial.convertedProductId 존재 (supplier_product_offers.id)
   * 처리:
   *  1. 참여자 organization 조회 (organization_members)
   *  2. organization_product_listings INSERT (source_type='market_trial', source_id=trialId)
   *  3. market_trial_participants.listingId 업데이트
   */
  static async createListingFromParticipant(req: AuthRequest, res: Response) {
    try {
      const { id, participantId } = req.params;
      const { price } = req.body;
      const ds = MarketTrialOperatorController.dataSource!;

      // 1. Load trial (must have convertedProductId = offerId)
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }
      if (!trial.convertedProductId) {
        return res.status(400).json({
          success: false,
          message: '상품 전환이 완료되지 않은 Trial입니다. 먼저 상품 전환을 실행해주세요.',
        });
      }

      // 2. Load participant — must be adopted or first_order
      const participantRows: Array<{
        participantId: string;
        customerConversionStatus: string;
        listingId: string | null;
      }> = await ds.query(
        `SELECT "participantId", COALESCE("customerConversionStatus", 'none') AS "customerConversionStatus", "listingId"
         FROM market_trial_participants
         WHERE id = $1 AND "marketTrialId" = $2`,
        [participantId, id],
      );

      if (!participantRows.length) {
        return res.status(404).json({ success: false, message: 'Participant not found for this trial' });
      }

      const participant = participantRows[0];
      const LISTING_ELIGIBLE = new Set(['adopted', 'first_order']);
      if (!LISTING_ELIGIBLE.has(participant.customerConversionStatus)) {
        return res.status(400).json({
          success: false,
          message: `매장 진열은 '취급 시작(adopted)' 이상 단계에서만 가능합니다. 현재: "${participant.customerConversionStatus}"`,
        });
      }
      if (participant.listingId) {
        return res.status(400).json({
          success: false,
          message: '이미 매장 진열이 등록된 참여자입니다.',
          data: { listingId: participant.listingId },
        });
      }

      // 3. Get participant's organizationId
      const orgRows: Array<{ organization_id: string }> = await ds.query(
        `SELECT organization_id FROM organization_members
         WHERE user_id = $1 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL
         LIMIT 1`,
        [participant.participantId],
      );
      if (!orgRows.length) {
        return res.status(400).json({
          success: false,
          message: '참여자의 매장 정보를 찾을 수 없습니다. 매장 미등록 상태입니다.',
        });
      }
      const organizationId = orgRows[0].organization_id;

      // 4. Get masterId from the linked offer
      const offerRows: Array<{ master_id: string }> = await ds.query(
        `SELECT master_id FROM supplier_product_offers WHERE id = $1 AND is_active = true`,
        [trial.convertedProductId],
      );
      if (!offerRows.length) {
        return res.status(400).json({
          success: false,
          message: '연결된 상품 공급 제안(offer)을 찾을 수 없습니다.',
        });
      }
      const masterId = offerRows[0].master_id;
      const listingPrice = price != null ? Number(price) : null;

      // 5. Insert listing (ON CONFLICT: return existing)
      const inserted: Array<{ id: string }> = await ds.query(
        `INSERT INTO organization_product_listings
          (id, organization_id, service_key, master_id, offer_id, is_active, price, source_type, source_id, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, 'neture', $2, $3, true, $4, 'market_trial', $5, NOW(), NOW())
         ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
         RETURNING id`,
        [organizationId, masterId, trial.convertedProductId, listingPrice, id],
      );

      let listingId: string;
      if (inserted.length > 0) {
        listingId = inserted[0].id;
      } else {
        // Already exists — fetch the existing listing id
        const existing: Array<{ id: string }> = await ds.query(
          `SELECT id FROM organization_product_listings
           WHERE organization_id = $1 AND service_key = 'neture' AND offer_id = $2
           LIMIT 1`,
          [organizationId, trial.convertedProductId],
        );
        listingId = existing[0]?.id;
      }

      // 6. Update participant.listingId
      await ds.query(
        `UPDATE market_trial_participants SET "listingId" = $1 WHERE id = $2`,
        [listingId, participantId],
      );

      res.status(201).json({
        success: true,
        data: { listingId, organizationId, offerId: trial.convertedProductId, masterId },
        message: '매장 진열이 등록되었습니다.',
      });
    } catch (error) {
      console.error('Create listing from participant error:', error);
      res.status(500).json({ success: false, message: 'Failed to create listing' });
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

      const allowedNextStatuses = ALLOWED_TRIAL_TRANSITIONS[trial.status as TrialStatus];
      if (!allowedNextStatuses || !allowedNextStatuses.includes(newStatus as TrialStatus)) {
        const allowed = allowedNextStatuses?.join(', ') || '없음';
        return res.status(400).json({
          success: false,
          message: `Cannot transition from "${trial.status}" to "${newStatus}". Allowed: ${allowed}`,
        });
      }

      trial.status = newStatus as TrialStatus;
      await MarketTrialOperatorController.trialRepo.save(trial);

      // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
      // Trial → OUTCOME_CONFIRMING 전환 시 pending 참여자 → choice_pending cascade
      let cascadeCount = 0;
      if (newStatus === TrialStatus.OUTCOME_CONFIRMING) {
        const ds = MarketTrialOperatorController.dataSource;
        if (ds) {
          const result = await ds.query(
            `UPDATE market_trial_participants
             SET "settlementStatus" = 'choice_pending'
             WHERE "marketTrialId" = $1
               AND COALESCE("settlementStatus", 'pending') = 'pending'`,
            [id],
          );
          cascadeCount = result?.rowCount ?? result?.length ?? 0;
        }
      }

      res.json({
        success: true,
        data: toOperatorTrialDTO(trial),
        message: `Trial 상태가 "${newStatus}"로 변경되었습니다.${cascadeCount > 0 ? ` 참여자 ${cascadeCount}명 정산 선택 대기로 전환.` : ''}`,
      });
    } catch (error) {
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

      const rows: Array<{
        participantName: string;
        participantType: string;
        rewardType: string | null;
        rewardStatus: string;
        createdAt: Date;
      }> = await ds.query(
        `SELECT
           COALESCE(u.name, u.email, '알 수 없음') AS "participantName",
           p."participantType",
           p."rewardType",
           p."rewardStatus",
           p."createdAt"
         FROM market_trial_participants p
         LEFT JOIN users u ON u.id = p."participantId"
         WHERE p."marketTrialId" = $1
         ORDER BY p."createdAt" DESC`,
        [id],
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
      const participantTypeLabel = (v: string) => {
        if (v === 'seller') return '판매자';
        if (v === 'partner') return '파트너';
        return v;
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

      // CSV header + rows
      const header = ['참여자명', '참여자유형', '보상방식', '보상상태', '참여일', 'Trial제목', 'Trial상태'];
      const trialTitle = (trial.title || '').replace(/"/g, '""');
      const trialStatusLabel: Record<string, string> = {
        draft: '작성 중', submitted: '심사 대기',
        recruiting: '모집 중', development: '준비 중',
        outcome_confirming: '결과 확정', fulfilled: '이행 완료', closed: '종료',
      };
      const trialStatusText = trialStatusLabel[trial.status] || trial.status;

      const csvRows = rows.map((r) => [
        `"${(r.participantName || '').replace(/"/g, '""')}"`,
        `"${participantTypeLabel(r.participantType)}"`,
        `"${rewardTypeLabel(r.rewardType)}"`,
        `"${rewardStatusLabel(r.rewardStatus)}"`,
        `"${fmtDate(r.createdAt)}"`,
        `"${trialTitle}"`,
        `"${trialStatusText}"`,
      ].join(','));

      // BOM for Excel UTF-8 compatibility
      const bom = '\uFEFF';
      const csv = bom + [header.join(','), ...csvRows].join('\n');

      const safeTitle = (trial.title || 'trial').replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 30);
      const filename = `market-trial-${safeTitle}-participants.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Operator export participants CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export participants' });
    }
  }

  // ============================================================================
  // Trial → Product Conversion
  // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
  // ============================================================================

  /**
   * POST /api/v1/neture/operator/market-trial/:id/convert
   * Trial → 상품 전환
   *
   * Body:
   *   productId?      — 기존 ProductMaster UUID (A안: 연결)
   *   productName?    — 새 상품 이름 (B안: 생성)
   *   conversionNote? — 운영자 메모
   *
   * 전환 조건: status = FULFILLED | CLOSED, 미전환 상태
   */
  static async convertToProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { productId, productName, conversionNote } = req.body;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      // Already converted
      if (trial.convertedProductId) {
        return res.status(400).json({
          success: false,
          message: '이미 상품 전환이 완료된 Trial입니다.',
          data: { convertedProductId: trial.convertedProductId, convertedProductName: trial.convertedProductName },
        });
      }

      // Conversion eligibility check
      if (!CONVERSION_ELIGIBLE_STATUSES.includes(trial.status as TrialStatus)) {
        return res.status(400).json({
          success: false,
          message: `상품 전환은 이행 완료(fulfilled) 또는 종료(closed) 상태에서만 가능합니다. 현재 상태: "${trial.status}"`,
        });
      }

      const ds = MarketTrialOperatorController.dataSource!;
      let linkedProductId: string;
      let linkedProductName: string;

      if (productId) {
        // A안: supplier_product_offers.id 기준으로 연결 (neture 도메인 기준)
        const rows: Array<{ id: string; name: string }> = await ds.query(
          `SELECT spo.id,
                  COALESCE(pm.marketing_name, pm.regulatory_name, '') AS name
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.id = $1 AND spo.deleted_at IS NULL
           LIMIT 1`,
          [productId],
        );
        if (!rows.length) {
          return res.status(404).json({ success: false, message: '연결할 상품을 찾을 수 없습니다.' });
        }
        linkedProductId = rows[0].id;
        linkedProductName = rows[0].name;
      } else if (productName) {
        // B안: neture product_masters는 barcode 등 필수 필드가 있어 이 경로로 직접 생성 불가
        // → 상품 관리 화면에서 상품을 먼저 등록한 후 연결해주세요
        return res.status(400).json({
          success: false,
          message: '신규 상품 생성은 상품 관리 화면에서 진행 후 productId로 연결해주세요.',
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'productId(연결할 상품 ID)를 제공해야 합니다.',
        });
      }

      // Save conversion on trial
      trial.convertedProductId = linkedProductId;
      trial.convertedProductName = linkedProductName;
      if (conversionNote) trial.conversionNote = conversionNote;
      await MarketTrialOperatorController.trialRepo.save(trial);

      // Fetch product reward participant count for response
      const [{ product_count }] = await ds.query(
        `SELECT COUNT(*) FILTER (WHERE "rewardType" = 'product')::int AS product_count
         FROM market_trial_participants WHERE "marketTrialId" = $1`,
        [id],
      );

      // WO-MARKET-TRIAL-CONVERSION-NOTIFICATION-V1: fire-and-forget notification dispatch
      void dispatchConversionNotifications(
        ds,
        id,
        linkedProductId,
        linkedProductName,
        MarketTrialOperatorController.trialRepo,
      ).catch((err) => {
        console.error('[MarketTrial] Conversion notification dispatch failed:', err);
      });

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial),
          conversionResult: {
            productId: linkedProductId,
            productName: linkedProductName,
            productRewardCount: product_count,
            note: conversionNote || null,
          },
        },
        message: `Trial이 상품 "${linkedProductName}"으로 전환되었습니다.`,
      });
    } catch (error) {
      console.error('Convert trial to product error:', error);
      res.status(500).json({ success: false, message: 'Failed to convert trial to product' });
    }
  }

  // ============================================================================
  // WO-MONITOR-1: 포럼 연계 실패 조회 API
  // ============================================================================

  /**
   * GET /api/v1/neture/operator/market-trial/forum-sync-failures
   * 포럼 연계 실패 목록 (운영자 전용)
   * query: trialId?, resolved? (true|false), limit?, page?
   */
  static async listForumSyncFailures(req: AuthRequest, res: Response) {
    try {
      const { trialId, resolved, limit: limitStr, page: pageStr } = req.query;

      const limit = Math.min(100, Math.max(1, Number(limitStr) || 50));
      const page = Math.max(1, Number(pageStr) || 1);
      const offset = (page - 1) * limit;

      const qb = MarketTrialOperatorController.forumSyncFailureRepo
        .createQueryBuilder('f')
        .orderBy('f.occurredAt', 'DESC')
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
      const { note } = req.body as { note?: string };

      const record = await MarketTrialOperatorController.forumSyncFailureRepo.findOne({
        where: { id: failureId },
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'Failure record not found' });
      }

      if (record.resolvedAt) {
        return res.status(400).json({ success: false, message: 'Already resolved' });
      }

      record.resolvedAt = new Date();
      record.resolutionNote = note ?? null;
      await MarketTrialOperatorController.forumSyncFailureRepo.save(record);

      res.json({ success: true, data: toForumSyncFailureDTO(record) });
    } catch (error) {
      console.error('resolveForumSyncFailure error:', error);
      res.status(500).json({ success: false, message: 'Failed to resolve failure record' });
    }
  }

}

// ============================================================================
// WO-MARKET-TRIAL-CONVERSION-NOTIFICATION-V1
// ============================================================================

/**
 * Fire-and-forget: notify product-reward participants when their trial converts to a product.
 *
 * Guards:
 * - Checks notificationSentAt to prevent duplicate sends
 * - Skips users with no active account (is_active = false / deleted)
 */
async function dispatchConversionNotifications(
  ds: DataSource,
  trialId: string,
  productId: string,
  productName: string,
  trialRepo: Repository<MarketTrial>,
): Promise<void> {
  // Re-read from DB to guard against duplicate dispatch
  const fresh = await trialRepo.findOne({ where: { id: trialId } });
  if (!fresh || fresh.notificationSentAt) {
    return; // already dispatched or trial missing
  }

  // Mark as dispatched BEFORE sending to prevent races
  await ds.query(
    `UPDATE market_trials SET "notificationSentAt" = NOW() WHERE id = $1 AND "notificationSentAt" IS NULL`,
    [trialId],
  );

  // Fetch product-reward participants (active users only)
  const participants: Array<{ participantId: string }> = await ds.query(
    `SELECT p."participantId"
     FROM market_trial_participants p
     JOIN users u ON u.id = p."participantId"
     WHERE p."marketTrialId" = $1
       AND p."rewardType" = 'product'
       AND u."isActive" = true`,
    [trialId],
  );

  if (!participants.length) return;

  const title = '참여하신 Trial 상품이 정식 등록되었습니다';
  const message = `"${productName}" 상품이 정식 등록되었습니다. 지금 바로 확인해보세요.`;
  const metadata = JSON.stringify({ trialId, productId, linkUrl: `/hub/products/${productId}` });

  // Batch insert notifications — one per participant
  for (const { participantId } of participants) {
    await ds.query(
      `INSERT INTO notifications (id, "userId", channel, type, title, message, metadata, "isRead", "createdAt")
       VALUES (gen_random_uuid(), $1, 'in_app', 'custom', $2, $3, $4, false, NOW())`,
      [participantId, title, message, metadata],
    );
  }

  console.error(`[MarketTrial] Sent conversion notifications for trial ${trialId} → ${participants.length} participant(s)`);
}

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

function toOperatorTrialDTO(trial: MarketTrial) {
  return {
    id: trial.id,
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
    // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
    convertedProductId: trial.convertedProductId || null,
    convertedProductName: trial.convertedProductName || null,
    conversionNote: trial.conversionNote || null,
    createdAt: new Date(trial.createdAt).toISOString(),
    updatedAt: new Date(trial.updatedAt).toISOString(),
  };
}

