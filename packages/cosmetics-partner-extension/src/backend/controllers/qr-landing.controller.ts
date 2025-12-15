/**
 * QR/Landing Page Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * POST /api/v1/partner/qr/generate - QR 코드 생성
 * GET /api/v1/partner/qr/styles - QR 스타일 목록
 * GET /api/v1/partner/qr/sizes - QR 크기 목록
 * POST /api/v1/partner/shortlink - 단축 URL 생성
 * GET /api/v1/partner/landing/:slug - 랜딩 페이지 데이터
 */

import { Request, Response } from 'express';
import { QRLandingService, GenerateQRDto, CreateShortLinkDto } from '../services/qr-landing.service.js';

export class QRLandingController {
  constructor(private qrLandingService: QRLandingService) {}

  /**
   * Generate QR code
   * POST /qr/generate
   */
  async generateQR(req: Request, res: Response): Promise<void> {
    try {
      const dto: GenerateQRDto = req.body;

      if (!dto.partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      if (!dto.linkId && !dto.targetUrl && !dto.customSlug) {
        res.status(400).json({
          success: false,
          error: 'Either linkId, targetUrl, or customSlug is required',
        });
        return;
      }

      const result = await this.qrLandingService.generateQRCode(dto);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      });
    }
  }

  /**
   * Get QR style options
   * GET /qr/styles
   */
  async getStyles(req: Request, res: Response): Promise<void> {
    try {
      const styles = await this.qrLandingService.getQRStyles();

      res.status(200).json({
        success: true,
        data: styles,
      });
    } catch (error) {
      console.error('Error fetching QR styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QR styles',
      });
    }
  }

  /**
   * Get QR size options
   * GET /qr/sizes
   */
  async getSizes(req: Request, res: Response): Promise<void> {
    try {
      const sizes = await this.qrLandingService.getQRSizes();

      res.status(200).json({
        success: true,
        data: sizes,
      });
    } catch (error) {
      console.error('Error fetching QR sizes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QR sizes',
      });
    }
  }

  /**
   * Create short link
   * POST /shortlink
   */
  async createShortLink(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateShortLinkDto = req.body;

      if (!dto.partnerId) {
        res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
        return;
      }

      if (!dto.targetUrl) {
        res.status(400).json({
          success: false,
          error: 'targetUrl is required',
        });
        return;
      }

      const result = await this.qrLandingService.createShortLink(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error creating short link:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create short link',
      });
    }
  }

  /**
   * Get landing page data
   * GET /landing/:slug
   */
  async getLandingPage(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: 'slug is required',
        });
        return;
      }

      // Track click
      await this.qrLandingService.trackClick(slug, {
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
        ip: req.ip,
      });

      const landingData = await this.qrLandingService.getLandingPageData(slug);

      if (!landingData) {
        res.status(404).json({
          success: false,
          error: 'Landing page not found',
        });
        return;
      }

      // If there's a redirect URL, redirect
      if (landingData.redirectUrl) {
        res.redirect(302, landingData.redirectUrl);
        return;
      }

      res.status(200).json({
        success: true,
        data: landingData,
      });
    } catch (error) {
      console.error('Error fetching landing page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch landing page',
      });
    }
  }
}
