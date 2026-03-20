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
   * 1차 승인: SUBMITTED → APPROVED + ServiceApproval 레코드 생성
   */
  static async approve1st(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

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

      // Transition to APPROVED
      trial.status = TrialStatus.APPROVED;
      await MarketTrialOperatorController.trialRepo.save(trial);

      // Create ServiceApproval records for each visibleServiceKey
      const approvals: MarketTrialServiceApproval[] = [];
      for (const serviceKey of trial.visibleServiceKeys) {
        const approval = MarketTrialOperatorController.approvalRepo.create({
          trialId: trial.id,
          serviceKey,
          status: ServiceApprovalStatus.PENDING,
        });
        approvals.push(await MarketTrialOperatorController.approvalRepo.save(approval));
      }

      // Create forum mapping (placeholder)
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

      // If no visibleServiceKeys → auto-transition to RECRUITING (no 2nd approval needed)
      if (trial.visibleServiceKeys.length === 0) {
        trial.status = TrialStatus.RECRUITING;
        await MarketTrialOperatorController.trialRepo.save(trial);
      }

      res.json({
        success: true,
        data: {
          ...toOperatorTrialDTO(trial),
          serviceApprovals: approvals.map(toServiceApprovalDTO),
        },
        message: 'Trial approved (1st). Service approvals created.',
      });
    } catch (error) {
      console.error('Operator approve 1st error:', error);
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

  /**
   * PATCH /api/v1/:serviceKey/operator/market-trial/:id/approve
   * 2차 승인: ServiceApproval pending → approved
   * 모든 ServiceApproval approved → trial APPROVED → RECRUITING
   */
  static async approve2nd(req: AuthRequest, res: Response) {
    try {
      const { serviceKey, id } = req.params;
      const userId = (req as any).user?.id;

      const approval = await MarketTrialOperatorController.approvalRepo.findOne({
        where: { trialId: id, serviceKey },
      });
      if (!approval) {
        return res.status(404).json({ success: false, message: 'Service approval not found' });
      }
      if (approval.status !== ServiceApprovalStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: status is "${approval.status}", expected "pending"`,
        });
      }

      approval.status = ServiceApprovalStatus.APPROVED;
      approval.reviewedBy = userId || null;
      approval.reviewedAt = new Date();
      await MarketTrialOperatorController.approvalRepo.save(approval);

      // Check if ALL approvals for this trial are approved → transition to RECRUITING
      const allApprovals = await MarketTrialOperatorController.approvalRepo.find({
        where: { trialId: id },
      });
      const allApproved = allApprovals.every((a) => a.status === ServiceApprovalStatus.APPROVED);

      let trial = await MarketTrialOperatorController.trialRepo.findOne({ where: { id } });
      if (allApproved && trial && trial.status === TrialStatus.APPROVED) {
        trial.status = TrialStatus.RECRUITING;
        await MarketTrialOperatorController.trialRepo.save(trial);
      }

      res.json({
        success: true,
        data: {
          serviceApproval: toServiceApprovalDTO(approval),
          trialStatus: trial?.status,
          allApproved,
        },
        message: allApproved
          ? 'Service approved. All services approved — trial now RECRUITING.'
          : 'Service approved. Waiting for other service approvals.',
      });
    } catch (error) {
      console.error('Service operator approve error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve' });
    }
  }

  /**
   * PATCH /api/v1/:serviceKey/operator/market-trial/:id/reject
   * 2차 반려: ServiceApproval pending → rejected
   */
  static async reject2nd(req: AuthRequest, res: Response) {
    try {
      const { serviceKey, id } = req.params;
      const userId = (req as any).user?.id;
      const { reason } = req.body;

      const approval = await MarketTrialOperatorController.approvalRepo.findOne({
        where: { trialId: id, serviceKey },
      });
      if (!approval) {
        return res.status(404).json({ success: false, message: 'Service approval not found' });
      }
      if (approval.status !== ServiceApprovalStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Cannot reject: status is "${approval.status}", expected "pending"`,
        });
      }

      approval.status = ServiceApprovalStatus.REJECTED;
      approval.reviewedBy = userId || null;
      approval.reviewedAt = new Date();
      approval.reason = reason || null;
      await MarketTrialOperatorController.approvalRepo.save(approval);

      res.json({
        success: true,
        data: { serviceApproval: toServiceApprovalDTO(approval) },
        message: reason ? `Service rejected: ${reason}` : 'Service rejected',
      });
    } catch (error) {
      console.error('Service operator reject error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject' });
    }
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
