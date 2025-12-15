/**
 * Partner Storefront Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * GET /api/v1/partner/storefront/:slug - 스토어프론트 데이터 조회
 * PUT /api/v1/partner/storefront/:partnerId/config - 설정 업데이트
 * GET /api/v1/partner/storefront/themes - 테마 목록
 * GET /api/v1/partner/storefront/layouts - 레이아웃 목록
 * GET /api/v1/partner/storefront/:partnerId/preview - 미리보기 생성
 */

import { Request, Response } from 'express';
import { PartnerStorefrontService, UpdateStorefrontDto } from '../services/partner-storefront.service.js';

export class PartnerStorefrontController {
  constructor(private storefrontService: PartnerStorefrontService) {}

  /**
   * Get storefront data by slug
   * GET /storefront/:slug
   */
  async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: 'slug is required',
        });
        return;
      }

      const storefront = await this.storefrontService.getStorefrontBySlug(slug);

      if (!storefront) {
        res.status(404).json({
          success: false,
          error: 'Storefront not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: storefront,
      });
    } catch (error) {
      console.error('Error fetching storefront:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch storefront',
      });
    }
  }

  /**
   * Update storefront configuration
   * PUT /storefront/:partnerId/config
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const dto: UpdateStorefrontDto = req.body;

      if (!partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      const config = await this.storefrontService.updateStorefrontConfig(partnerId, dto);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error updating storefront config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config',
      });
    }
  }

  /**
   * Get available themes
   * GET /storefront/themes
   */
  async getThemes(req: Request, res: Response): Promise<void> {
    try {
      const themes = await this.storefrontService.getThemes();

      res.status(200).json({
        success: true,
        data: themes,
      });
    } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch themes',
      });
    }
  }

  /**
   * Get available layouts
   * GET /storefront/layouts
   */
  async getLayouts(req: Request, res: Response): Promise<void> {
    try {
      const layouts = await this.storefrontService.getLayouts();

      res.status(200).json({
        success: true,
        data: layouts,
      });
    } catch (error) {
      console.error('Error fetching layouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch layouts',
      });
    }
  }

  /**
   * Generate storefront preview
   * GET /storefront/:partnerId/preview
   */
  async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;

      if (!partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      const html = await this.storefrontService.generatePreview(partnerId);

      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      });
    }
  }
}
