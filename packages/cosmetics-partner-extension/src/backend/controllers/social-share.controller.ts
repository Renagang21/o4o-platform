/**
 * Social Share Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * POST /api/v1/partner/social/generate - 공유 콘텐츠 생성
 * GET /api/v1/partner/social/platforms - 플랫폼 목록
 * GET /api/v1/partner/social/:partnerId/analytics - 공유 분석
 */

import { Request, Response } from 'express';
import { SocialShareService, GenerateShareContentDto } from '../services/social-share.service.js';

export class SocialShareController {
  constructor(private socialShareService: SocialShareService) {}

  /**
   * Generate share content
   * POST /social/generate
   */
  async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const dto: GenerateShareContentDto = req.body;

      if (!dto.partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      if (!dto.platform) {
        res.status(400).json({
          success: false,
          error: 'platform is required (instagram, facebook, twitter, kakao, blog)',
        });
        return;
      }

      if (!dto.contentType) {
        res.status(400).json({
          success: false,
          error: 'contentType is required (product, routine, storefront, custom)',
        });
        return;
      }

      const validPlatforms = ['instagram', 'facebook', 'twitter', 'kakao', 'blog'];
      if (!validPlatforms.includes(dto.platform)) {
        res.status(400).json({
          success: false,
          error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
        });
        return;
      }

      const validContentTypes = ['product', 'routine', 'storefront', 'custom'];
      if (!validContentTypes.includes(dto.contentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`,
        });
        return;
      }

      const content = await this.socialShareService.generateShareContent(dto);

      res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error('Error generating share content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate share content',
      });
    }
  }

  /**
   * Get available platforms
   * GET /social/platforms
   */
  async getPlatforms(req: Request, res: Response): Promise<void> {
    try {
      const platforms = await this.socialShareService.getPlatforms();

      res.status(200).json({
        success: true,
        data: platforms,
      });
    } catch (error) {
      console.error('Error fetching platforms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platforms',
      });
    }
  }

  /**
   * Get share analytics for a partner
   * GET /social/:partnerId/analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;

      if (!partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      const analytics = await this.socialShareService.getShareAnalytics(partnerId);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching share analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch share analytics',
      });
    }
  }
}
