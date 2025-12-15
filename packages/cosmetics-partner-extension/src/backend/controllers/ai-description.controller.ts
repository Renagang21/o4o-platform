/**
 * AI Product Description Generator Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * POST /api/v1/partner/ai/description - AI 기반 제품 설명 생성
 * GET /api/v1/partner/ai/description/tones - 사용 가능한 톤 목록
 * GET /api/v1/partner/ai/description/platforms - 사용 가능한 플랫폼 목록
 */

import { Request, Response } from 'express';
import { AIDescriptionService, GenerateDescriptionDto } from '../services/ai-description.service.js';

export class AIDescriptionController {
  constructor(private aiDescriptionService: AIDescriptionService) {}

  /**
   * Generate AI-powered product description
   * POST /ai/description
   */
  async generateDescription(req: Request, res: Response): Promise<void> {
    try {
      const dto: GenerateDescriptionDto = req.body;

      // Validate required fields
      if (!dto.productName) {
        res.status(400).json({
          success: false,
          error: 'productName is required',
        });
        return;
      }

      if (!dto.tone) {
        res.status(400).json({
          success: false,
          error: 'tone is required (casual, professional, friendly, trendy)',
        });
        return;
      }

      if (!dto.platform) {
        res.status(400).json({
          success: false,
          error: 'platform is required (instagram, blog, youtube, twitter, general)',
        });
        return;
      }

      const validTones = ['casual', 'professional', 'friendly', 'trendy'];
      if (!validTones.includes(dto.tone)) {
        res.status(400).json({
          success: false,
          error: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
        });
        return;
      }

      const validPlatforms = ['instagram', 'blog', 'youtube', 'twitter', 'general'];
      if (!validPlatforms.includes(dto.platform)) {
        res.status(400).json({
          success: false,
          error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
        });
        return;
      }

      const description = await this.aiDescriptionService.generateDescription(dto);

      res.status(200).json({
        success: true,
        data: description,
      });
    } catch (error) {
      console.error('Error generating description:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate description',
      });
    }
  }

  /**
   * Get available tones
   * GET /ai/description/tones
   */
  async getTones(req: Request, res: Response): Promise<void> {
    try {
      const tones = await this.aiDescriptionService.getTones();

      res.status(200).json({
        success: true,
        data: tones,
      });
    } catch (error) {
      console.error('Error fetching tones:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tones',
      });
    }
  }

  /**
   * Get available platforms
   * GET /ai/description/platforms
   */
  async getPlatforms(req: Request, res: Response): Promise<void> {
    try {
      const platforms = await this.aiDescriptionService.getPlatforms();

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
}
