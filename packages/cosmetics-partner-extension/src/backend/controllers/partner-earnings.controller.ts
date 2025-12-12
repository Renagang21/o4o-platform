/**
 * PartnerEarningsController
 *
 * 파트너 수익 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type {
  PartnerEarningsService,
  CreatePartnerEarningsDto,
  UpdatePartnerEarningsDto,
  EarningsFilter,
} from '../services/partner-earnings.service';

export class PartnerEarningsController {
  constructor(private readonly earningsService: PartnerEarningsService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePartnerEarningsDto = req.body;
      const earnings = await this.earningsService.logCommission(dto);
      res.status(201).json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.earningsService.findById(id);
      if (!earnings) {
        res.status(404).json({ success: false, message: 'Partner earnings not found' });
        return;
      }
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByPartnerId(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const earnings = await this.earningsService.findByPartnerId(partnerId);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByFilter(req: Request, res: Response): Promise<void> {
    try {
      const filter: EarningsFilter = {
        partnerId: req.query.partnerId as string,
        earningsType: req.query.earningsType as any,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const earnings = await this.earningsService.findByFilter(filter);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePartnerEarningsDto = req.body;
      const earnings = await this.earningsService.updateEarnings(id, dto);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.earningsService.approveEarnings(id);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async requestWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const { amount } = req.body;
      const withdrawal = await this.earningsService.processWithdrawal(partnerId, amount);
      res.json({ success: true, data: withdrawal });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const summary = await this.earningsService.getEarningsSummary(partnerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const earnings = await this.earningsService.getPendingApprovals();
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.earningsService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
