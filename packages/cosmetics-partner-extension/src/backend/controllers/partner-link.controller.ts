/**
 * PartnerLinkController
 *
 * 파트너 링크 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { PartnerLinkService } from '../services/partner-link.service';
import type { PartnerProfileService } from '../services/partner-profile.service';

export class PartnerLinkController {
  constructor(
    private readonly service: PartnerLinkService,
    private readonly profileService: PartnerProfileService
  ) {}

  /**
   * POST /api/v1/cosmetics-partner/links
   * 링크 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { linkType, targetId, title, description, customCommissionRate, expiresAt } = req.body;

      if (!linkType) {
        res.status(400).json({ error: 'linkType is required' });
        return;
      }

      const link = await this.service.createLink({
        partnerId: profile.id,
        linkType,
        targetId,
        title,
        description,
        customCommissionRate,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json(link);
    } catch (error) {
      console.error('[PartnerLinkController] create error:', error);
      res.status(500).json({ error: 'Failed to create partner link' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/links
   * 내 링크 목록 조회
   */
  async getMyLinks(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { linkType, status, page, limit } = req.query;

      const result = await this.service.findByPartnerId(profile.id, {
        linkType: linkType as any,
        status: status as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('[PartnerLinkController] getMyLinks error:', error);
      res.status(500).json({ error: 'Failed to get partner links' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/links/:id
   * 특정 링크 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const link = await this.service.findById(id);

      if (!link) {
        res.status(404).json({ error: 'Partner link not found' });
        return;
      }

      res.json(link);
    } catch (error) {
      console.error('[PartnerLinkController] findById error:', error);
      res.status(500).json({ error: 'Failed to get partner link' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/links/slug/:slug
   * URL Slug로 링크 조회 (공개)
   */
  async findBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const link = await this.service.findBySlug(slug);

      if (!link) {
        res.status(404).json({ error: 'Partner link not found' });
        return;
      }

      res.json(link);
    } catch (error) {
      console.error('[PartnerLinkController] findBySlug error:', error);
      res.status(500).json({ error: 'Failed to get partner link' });
    }
  }

  /**
   * PUT /api/v1/cosmetics-partner/links/:id
   * 링크 업데이트
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, customCommissionRate, status, expiresAt } = req.body;

      const updated = await this.service.updateLink(id, {
        title,
        description,
        customCommissionRate,
        status,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      if (!updated) {
        res.status(404).json({ error: 'Partner link not found' });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error('[PartnerLinkController] update error:', error);
      res.status(500).json({ error: 'Failed to update partner link' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/links/:id/click
   * 클릭 추적
   */
  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isUnique } = req.body;

      await this.service.incrementClicks(id, isUnique);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerLinkController] trackClick error:', error);
      res.status(500).json({ error: 'Failed to track click' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/links/:id/convert
   * 전환 기록
   */
  async recordConversion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { earnings } = req.body;

      if (typeof earnings !== 'number' || earnings < 0) {
        res.status(400).json({ error: 'Valid earnings amount is required' });
        return;
      }

      await this.service.incrementConversions(id, earnings);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerLinkController] recordConversion error:', error);
      res.status(500).json({ error: 'Failed to record conversion' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/links/stats
   * 내 링크 통계 조회
   */
  async getMyStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const stats = await this.service.getLinkStats(profile.id);
      res.json(stats);
    } catch (error) {
      console.error('[PartnerLinkController] getMyStats error:', error);
      res.status(500).json({ error: 'Failed to get link stats' });
    }
  }

  /**
   * DELETE /api/v1/cosmetics-partner/links/:id
   * 링크 삭제 (비활성화)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerLinkController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete partner link' });
    }
  }
}
