/**
 * ConsultationController
 *
 * 판매원 상담 로그 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type {
  ConsultationLogService,
  CreateConsultationLogDto,
  UpdateConsultationLogDto,
} from '../services/consultation-log.service.js';

export class ConsultationController {
  constructor(private readonly consultationService: ConsultationLogService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateConsultationLogDto = req.body;
      const log = await this.consultationService.create(dto);
      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateConsultationLogDto = req.body;
      const log = await this.consultationService.update(id, dto);
      res.json({ success: true, data: log });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const log = await this.consultationService.findById(id);
      if (!log) {
        res.status(404).json({ success: false, message: 'Consultation log not found' });
        return;
      }
      res.json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySellerId(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const logs = await this.consultationService.findBySellerId(sellerId, limit, offset);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByWorkflowSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const log = await this.consultationService.findByWorkflowSession(sessionId);
      if (!log) {
        res.status(404).json({ success: false, message: 'Consultation log not found' });
        return;
      }
      res.json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { purchasedProducts } = req.body;
      const log = await this.consultationService.completeConsultation(id, purchasedProducts);
      res.json({ success: true, data: log });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;
      const stats = await this.consultationService.getStats(sellerId, startDate, endDate);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getRecent(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      const logs = await this.consultationService.getRecentLogs(sellerId, days);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.consultationService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
