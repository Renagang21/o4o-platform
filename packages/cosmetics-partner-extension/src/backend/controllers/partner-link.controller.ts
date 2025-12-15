/**
 * PartnerLinkController
 *
 * 파트너 추천 링크 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type {
  PartnerLinkService,
  CreatePartnerLinkDto,
  UpdatePartnerLinkDto,
} from '../services/partner-link.service.js';

export class PartnerLinkController {
  constructor(private readonly linkService: PartnerLinkService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePartnerLinkDto = req.body;
      const link = await this.linkService.createLink(dto);
      res.status(201).json({ success: true, data: link });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const link = await this.linkService.findById(id);
      if (!link) {
        res.status(404).json({ success: false, message: 'Partner link not found' });
        return;
      }
      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const link = await this.linkService.findBySlug(slug);
      if (!link) {
        res.status(404).json({ success: false, message: 'Partner link not found' });
        return;
      }
      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByPartnerId(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const links = await this.linkService.findByPartnerId(partnerId);
      res.json({ success: true, data: links });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePartnerLinkDto = req.body;
      const link = await this.linkService.updateLink(id, dto);
      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const link = await this.linkService.incrementClicks(id);
      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async trackConversion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { earnings } = req.body;
      const link = await this.linkService.incrementConversions(id, earnings);
      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const stats = await this.linkService.getLinkStats(partnerId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTopPerforming(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const links = await this.linkService.getTopPerformingLinks(partnerId, limit);
      res.json({ success: true, data: links });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.linkService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
