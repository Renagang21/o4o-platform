/**
 * Market Trial Operator Controller
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 *
 * Handles:
 * - Neture operator 1st approval (SUBMITTED → APPROVED/CLOSED)
 * - Service operator 2nd approval (ServiceApproval: pending → approved/rejected)
 * - Operator trial listing (all trials / service-scoped)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { DataSource, Repository } from 'typeorm';
import {
  MarketTrial,
  TrialStatus,
  MarketTrialServiceApproval,
  ServiceApprovalStatus,
  MarketTrialForum,
} from '@o4o/market-trial';

export class MarketTrialOperatorController {
  private static dataSource: DataSource | null = null;
  private static trialRepo: Repository<MarketTrial>;
  private static approvalRepo: Repository<MarketTrialServiceApproval>;
  private static forumRepo: Repository<MarketTrialForum>;

  static setDataSource(ds: DataSource) {
    this.dataSource = ds;
    this.trialRepo = ds.getRepository(MarketTrial);
    this.approvalRepo = ds.getRepository(MarketTrialServiceApproval);
    this.forumRepo = ds.getRepository(MarketTrialForum);
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
   * Trial 상세 (ServiceApproval 포함)
   */
  static async getDetail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const approvals = await MarketTrialOperatorController.approvalRepo.find({
        where: { trialId: id },
        order: { createdAt: 'ASC' },
      });

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
          serviceApprovals: approvals.map(toServiceApprovalDTO),
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
   * visibleServiceKeys = 운영자가 지정한 오픈 대상 서비스 범위
   */
  static async approve1st(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { visibleServiceKeys } = req.body;

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

      // 오픈 대상 서비스 범위 지정 (운영자가 body로 전달 시)
      if (Array.isArray(visibleServiceKeys)) {
        trial.visibleServiceKeys = visibleServiceKeys;
      }

      // 단일 승인: SUBMITTED → RECRUITING (서비스별 2차 승인 없이 바로 모집 시작)
      trial.status = TrialStatus.RECRUITING;
      await MarketTrialOperatorController.trialRepo.save(trial);

      // WO-MARKET-TRIAL-KPA-FORUM-INTEGRATION-V1:
      // KPA-a Market Trial 포럼 카테고리에 자동 게시글 생성 + 매핑 저장
      const existingForum = await MarketTrialOperatorController.forumRepo.findOne({
        where: { marketTrialId: trial.id },
      });
      if (!existingForum && MarketTrialOperatorController.dataSource) {
        try {
          const ds = MarketTrialOperatorController.dataSource;
          const TRIAL_FORUM_CATEGORY_ID = 'f0000000-0a00-4000-f000-0000000000f1';

          // 카테고리 존재 확인
          const catExists = await ds.query(
            `SELECT id FROM forum_category WHERE id = $1`,
            [TRIAL_FORUM_CATEGORY_ID],
          );

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

            const forumPostId = inserted[0]?.id;
            if (forumPostId) {
              const forumMapping = MarketTrialOperatorController.forumRepo.create({
                marketTrialId: trial.id,
                forumId: forumPostId,
              });
              await MarketTrialOperatorController.forumRepo.save(forumMapping);
            }
          }
        } catch (forumError) {
          // 포럼 생성 실패는 승인 자체를 막지 않음 (재시도/수동 연결 가능)
          console.error('[MarketTrial] Forum post creation failed:', forumError);
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
  // Participant Export
  // WO-MARKET-TRIAL-PARTICIPANT-EXPORT-V1
  // ============================================================================

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
           COALESCE(u."displayName", u.email, '알 수 없음') AS "participantName",
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
        draft: '작성 중', submitted: '심사 대기', approved: '승인됨',
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
  // Service Operator 2nd Approval
  // WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1: DEPRECATED
  // 서비스별 2차 승인 제거됨. 아래 메서드들은 하위 호환용으로 유지하되
  // 실제 상태 전이 없이 403 반환.
  // ============================================================================

  /**
   * GET /api/v1/:serviceKey/operator/market-trial
   * 서비스별 Trial 목록 (ServiceApproval 상태 포함)
   */
  static async listForService(req: AuthRequest, res: Response) {
    try {
      const { serviceKey } = req.params;
      const { status: approvalStatusFilter } = req.query;

      // Trials visible to this service, excluding DRAFT/SUBMITTED
      const qb = MarketTrialOperatorController.trialRepo
        .createQueryBuilder('trial')
        .where(`trial."visibleServiceKeys" @> :serviceKeys::jsonb`, {
          serviceKeys: JSON.stringify([serviceKey]),
        })
        .andWhere('trial.status NOT IN (:...excludeStatuses)', {
          excludeStatuses: [TrialStatus.DRAFT, TrialStatus.SUBMITTED],
        })
        .orderBy('trial.createdAt', 'DESC');

      const trials = await qb.getMany();

      // Fetch service approvals for these trials
      const trialIds = trials.map((t) => t.id);
      let approvals: MarketTrialServiceApproval[] = [];
      if (trialIds.length > 0) {
        const aqb = MarketTrialOperatorController.approvalRepo
          .createQueryBuilder('sa')
          .where('sa.trialId IN (:...trialIds)', { trialIds })
          .andWhere('sa.serviceKey = :serviceKey', { serviceKey });
        approvals = await aqb.getMany();
      }

      const approvalMap = new Map(approvals.map((a) => [a.trialId, a]));

      // Optionally filter by approval status
      let result = trials.map((trial) => ({
        ...toOperatorTrialDTO(trial),
        serviceApproval: approvalMap.has(trial.id)
          ? toServiceApprovalDTO(approvalMap.get(trial.id)!)
          : null,
      }));

      if (approvalStatusFilter && typeof approvalStatusFilter === 'string') {
        result = result.filter((r) => r.serviceApproval?.status === approvalStatusFilter);
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Service operator list error:', error);
      res.status(500).json({ success: false, message: 'Failed to list trials for service' });
    }
  }

  /**
   * GET /api/v1/:serviceKey/operator/market-trial/:id
   * 서비스별 Trial 상세 (ServiceApproval 포함)
   */
  static async getDetailForService(req: AuthRequest, res: Response) {
    try {
      const { serviceKey, id } = req.params;

      const trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (!trial) {
        return res.status(404).json({ success: false, message: 'Trial not found' });
      }

      const approval = await MarketTrialOperatorController.approvalRepo.findOne({
        where: { trialId: id, serviceKey },
      });

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial),
          serviceApproval: approval ? toServiceApprovalDTO(approval) : null,
        },
      });
    } catch (error) {
      console.error('Service operator detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to get trial detail' });
    }
  }

  /** @deprecated WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1: 서비스별 2차 승인 제거 */
  static async approve2nd(req: AuthRequest, res: Response) {
    res.status(403).json({ success: false, message: 'Service-level approval is no longer required. Trials are approved by Neture operator only.' });
  }

  /** @deprecated WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1: 서비스별 2차 승인 제거 */
  static async reject2nd(req: AuthRequest, res: Response) {
    res.status(403).json({ success: false, message: 'Service-level approval is no longer required. Trials are approved by Neture operator only.' });
  }
}

// ============================================================================
// DTO converters
// ============================================================================

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
    visibleServiceKeys: trial.visibleServiceKeys,
    startDate: trial.fundingStartAt ? new Date(trial.fundingStartAt).toISOString() : undefined,
    endDate: trial.fundingEndAt ? new Date(trial.fundingEndAt).toISOString() : undefined,
    trialPeriodDays: trial.trialPeriodDays,
    createdAt: new Date(trial.createdAt).toISOString(),
    updatedAt: new Date(trial.updatedAt).toISOString(),
  };
}

function toServiceApprovalDTO(a: MarketTrialServiceApproval) {
  return {
    id: a.id,
    trialId: a.trialId,
    serviceKey: a.serviceKey,
    status: a.status,
    reviewedBy: a.reviewedBy,
    reviewedAt: a.reviewedAt ? new Date(a.reviewedAt).toISOString() : null,
    reason: a.reason,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}
