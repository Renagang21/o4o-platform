/**
 * CommissionPolicyController
 *
 * 커미션 정책 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { CommissionPolicyService } from '../services/commission-policy.service.js';
import type { CommissionEngineService } from '../services/commission-engine.service.js';

export class CommissionPolicyController {
  constructor(
    private readonly policyService: CommissionPolicyService,
    private readonly commissionEngine?: CommissionEngineService
  ) {}

  /**
   * POST /api/v1/cosmetics-partner/commission-policies
   * 정책 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        policyType,
        commissionRate,
        fixedAmount,
        partnerId,
        productId,
        campaignId,
        effectiveFrom,
        effectiveTo,
        priority,
        isActive,
        metadata,
      } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'name is required',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const createdBy = (req as any).user?.id;

      const policy = await this.policyService.create({
        name,
        policyType,
        commissionRate,
        fixedAmount,
        partnerId,
        productId,
        campaignId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        priority,
        isActive,
        metadata,
        createdBy,
      });

      res.status(201).json({ success: true, data: policy });
    } catch (error) {
      console.error('[CommissionPolicyController] create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create commission policy',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/commission-policies
   * 정책 목록 조회
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        partnerId,
        productId,
        campaignId,
        isActive,
        policyType,
      } = req.query;

      const filter = {
        partnerId: partnerId as string | undefined,
        productId: productId as string | undefined,
        campaignId: campaignId as string | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        policyType: policyType as 'PERCENT' | 'FIXED' | undefined,
      };

      const result = await this.policyService.findAll(
        parseInt(page as string),
        parseInt(limit as string),
        filter
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[CommissionPolicyController] findAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get commission policies',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/commission-policies/:id
   * 정책 상세 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policy = await this.policyService.findById(id);

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Commission policy not found',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[CommissionPolicyController] findById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get commission policy',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics-partner/commission-policies/:id
   * 정책 업데이트
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        policyType,
        commissionRate,
        fixedAmount,
        partnerId,
        productId,
        campaignId,
        effectiveFrom,
        effectiveTo,
        priority,
        isActive,
        metadata,
      } = req.body;

      const policy = await this.policyService.update(id, {
        name,
        policyType,
        commissionRate,
        fixedAmount,
        partnerId,
        productId,
        campaignId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        priority,
        isActive,
        metadata,
      });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Commission policy not found',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[CommissionPolicyController] update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update commission policy',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * PATCH /api/v1/cosmetics-partner/commission-policies/:id/active
   * 정책 활성화/비활성화
   */
  async setActive(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const policy = await this.policyService.setActive(id, isActive);

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Commission policy not found',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[CommissionPolicyController] setActive error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update policy status',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics-partner/commission-policies/:id
   * 정책 삭제
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.policyService.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Commission policy not found',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, message: 'Commission policy deleted' });
    } catch (error) {
      console.error('[CommissionPolicyController] delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete commission policy',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/commission-policies/:id/duplicate
   * 정책 복제
   */
  async duplicate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const policy = await this.policyService.duplicate(id, name);

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Commission policy not found',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      res.status(201).json({ success: true, data: policy });
    } catch (error) {
      console.error('[CommissionPolicyController] duplicate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate commission policy',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/commission/simulate
   * 커미션 시뮬레이션
   */
  async simulate(req: Request, res: Response): Promise<void> {
    try {
      if (!this.commissionEngine) {
        res.status(503).json({
          success: false,
          message: 'Commission engine not available',
          errorCode: 'SERVICE_UNAVAILABLE',
        });
        return;
      }

      const { partnerId, eventType, eventValue, productId, campaignId } = req.body;

      if (!partnerId || !eventType || eventValue === undefined) {
        res.status(400).json({
          success: false,
          message: 'partnerId, eventType, and eventValue are required',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const result = await this.commissionEngine.simulate({
        partnerId,
        eventType,
        eventValue,
        productId,
        campaignId,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[CommissionPolicyController] simulate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to simulate commission',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/commission-policies/statistics
   * 정책 통계
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.policyService.getStatistics();
      res.json({ success: true, data: statistics });
    } catch (error) {
      console.error('[CommissionPolicyController] getStatistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/commission-policies/partner/:partnerId
   * 파트너별 정책 조회
   */
  async getPartnerPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const policies = await this.policyService.getPartnerPolicies(partnerId);
      res.json({ success: true, data: policies });
    } catch (error) {
      console.error('[CommissionPolicyController] getPartnerPolicies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get partner policies',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }
}
