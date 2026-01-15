/**
 * PartnerController
 * 파트너 대시보드 API v1 엔드포인트
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * Endpoints:
 * GET  /api/v1/partner/overview
 * GET  /api/v1/partner/targets
 * GET  /api/v1/partner/content
 * POST /api/v1/partner/content
 * PATCH /api/v1/partner/content/:id
 * GET  /api/v1/partner/events
 * POST /api/v1/partner/events
 * PATCH /api/v1/partner/events/:id
 * GET  /api/v1/partner/status
 */

import { Request, Response } from 'express';
import { requirePartnerContext } from './guards/partner-context.guard.js';
import { PartnerOverviewService } from './services/partner-overview.service.js';
import { PartnerTargetService } from './services/partner-target.service.js';
import { PartnerContentService } from './services/partner-content.service.js';
import { PartnerEventService } from './services/partner-event.service.js';
import { PartnerStatusService } from './services/partner-status.service.js';
import type {
  CreatePartnerContentDto,
  UpdatePartnerContentDto,
  CreatePartnerEventDto,
  UpdatePartnerEventDto,
} from './dto/partner.dto.js';

export class PartnerDashboardController {
  /**
   * GET /api/v1/partner/overview
   * 파트너 대시보드 요약 정보
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);

      const overview = await PartnerOverviewService.getOverview(
        context.partnerId,
        context.serviceId
      );

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get overview',
      });
    }
  }

  /**
   * GET /api/v1/partner/targets
   * 홍보 대상 목록 (Read Only)
   */
  static async getTargets(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);

      const targets = await PartnerTargetService.getTargets(
        context.partnerId,
        context.serviceId
      );

      res.json({
        success: true,
        data: targets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get targets',
      });
    }
  }

  /**
   * GET /api/v1/partner/content
   * 콘텐츠 목록
   */
  static async getContents(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);

      const contents = await PartnerContentService.getContents(
        context.partnerId,
        context.serviceId
      );

      res.json({
        success: true,
        data: contents,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get contents',
      });
    }
  }

  /**
   * POST /api/v1/partner/content
   * 콘텐츠 생성
   */
  static async createContent(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);
      const data: CreatePartnerContentDto = req.body;

      // Validate required fields
      if (!data.type || !data.title) {
        res.status(400).json({
          success: false,
          error: 'type and title are required',
        });
        return;
      }

      // Validate type
      if (!['text', 'image', 'link'].includes(data.type)) {
        res.status(400).json({
          success: false,
          error: 'type must be text, image, or link',
        });
        return;
      }

      const content = await PartnerContentService.createContent(
        context.partnerId,
        context.serviceId,
        data
      );

      res.status(201).json({
        success: true,
        data: content,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create content',
      });
    }
  }

  /**
   * PATCH /api/v1/partner/content/:id
   * 콘텐츠 수정
   */
  static async updateContent(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);
      const { id } = req.params;
      const data: UpdatePartnerContentDto = req.body;

      const content = await PartnerContentService.updateContent(
        context.partnerId,
        context.serviceId,
        id,
        data
      );

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update content',
      });
    }
  }

  /**
   * GET /api/v1/partner/events
   * 이벤트 목록
   */
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);

      const events = await PartnerEventService.getEvents(
        context.partnerId,
        context.serviceId
      );

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get events',
      });
    }
  }

  /**
   * POST /api/v1/partner/events
   * 이벤트 생성
   */
  static async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);
      const data: CreatePartnerEventDto = req.body;

      // Validate required fields
      if (!data.name || !data.startDate || !data.endDate || !data.region || !data.targetScope) {
        res.status(400).json({
          success: false,
          error: 'name, startDate, endDate, region, and targetScope are required',
        });
        return;
      }

      const event = await PartnerEventService.createEvent(
        context.partnerId,
        context.serviceId,
        data
      );

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create event',
      });
    }
  }

  /**
   * PATCH /api/v1/partner/events/:id
   * 이벤트 수정
   */
  static async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);
      const { id } = req.params;
      const data: UpdatePartnerEventDto = req.body;

      const event = await PartnerEventService.updateEvent(
        context.partnerId,
        context.serviceId,
        id,
        data
      );

      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update event',
      });
    }
  }

  /**
   * GET /api/v1/partner/status
   * 콘텐츠/이벤트 상태 조회
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const context = requirePartnerContext(req);

      const status = await PartnerStatusService.getStatus(
        context.partnerId,
        context.serviceId
      );

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
      });
    }
  }
}
