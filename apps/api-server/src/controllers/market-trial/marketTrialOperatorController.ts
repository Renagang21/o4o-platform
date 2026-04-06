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

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial),
          serviceApprovals: approvals.map(toServiceApprovalDTO),
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

      // Create forum mapping (placeholder for Phase 3 forum integration)
      const existingForum = await MarketTrialOperatorController.forumRepo.findOne({
        where: { marketTrialId: trial.id },
      });
      if (!existingForum) {
        const forumMapping = MarketTrialOperatorController.forumRepo.create({
          marketTrialId: trial.id,
          forumId: `forum_${trial.id}`,
        });
        await MarketTrialOperatorController.forumRepo.save(forumMapping);
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
