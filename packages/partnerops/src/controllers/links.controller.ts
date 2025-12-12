/**
 * PartnerOps Links Controller
 *
 * Partner-Core 기반 제휴 링크 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { LinkService, CreateLinkDto } from '../services/LinkService.js';
import type { ApiResponseDto } from '../dto/index.js';
import { LinkTargetType } from '@o4o/partner-core';

export class LinksController {
  constructor(private linkService: LinkService) {}

  /**
   * GET /partnerops/links
   * 링크 목록 조회
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const links = await this.linkService.list(partnerId, {
        productType: req.query.productType as string | undefined,
        targetType: req.query.targetType as LinkTargetType | undefined,
      });

      const response: ApiResponseDto<typeof links> = {
        success: true,
        data: links,
      };
      res.json(response);
    } catch (error: any) {
      console.error('List links error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /partnerops/links
   * 링크 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const dto: CreateLinkDto = {
        targetType: req.body.targetType || LinkTargetType.PRODUCT,
        targetId: req.body.targetId,
        originalUrl: req.body.originalUrl,
        productType: req.body.productType,
        routineId: req.body.routineId,
      };

      const link = await this.linkService.create(partnerId, dto);

      const response: ApiResponseDto<typeof link> = {
        success: true,
        data: link,
        message: 'Link created successfully',
      };
      res.status(201).json(response);
    } catch (error: any) {
      console.error('Create link error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/links/:id/stats
   * 링크 통계 조회
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const linkId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const stats = await this.linkService.getStats(partnerId, linkId);

      if (!stats) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Link not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof stats> = {
        success: true,
        data: stats,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get link stats error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * DELETE /partnerops/links/:id
   * 링크 삭제
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const linkId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const deleted = await this.linkService.delete(partnerId, linkId);

      if (!deleted) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Link not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<null> = {
        success: true,
        message: 'Link deleted successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Delete link error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/links/summary
   * 파트너별 링크 통계 요약
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const summary = await this.linkService.getPartnerLinkStats(partnerId);

      const response: ApiResponseDto<typeof summary> = {
        success: true,
        data: summary,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get link summary error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default LinksController;
