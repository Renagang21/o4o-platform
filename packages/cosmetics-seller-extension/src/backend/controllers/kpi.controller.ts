/**
 * KPIController
 *
 * 판매원 KPI API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { KPIService, CreateKPIDto } from '../services/kpi.service.js';

export class KPIController {
  constructor(private readonly kpiService: KPIService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateKPIDto = req.body;
      const kpi = await this.kpiService.create(dto);
      res.status(201).json({ success: true, data: kpi });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const kpi = await this.kpiService.findById(id);
      if (!kpi) {
        res.status(404).json({ success: false, message: 'KPI record not found' });
        return;
      }
      res.json({ success: true, data: kpi });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySellerId(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const periodType = req.query.periodType as string | undefined;
      const limit = parseInt(req.query.limit as string) || 30;

      const kpis = await this.kpiService.findBySellerId(
        sellerId,
        periodType as 'daily' | 'weekly' | 'monthly' | undefined,
        limit
      );
      res.json({ success: true, data: kpis });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const summary = await this.kpiService.getSummary(sellerId, startDate, endDate);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async computeDaily(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const date = req.query.date
        ? new Date(req.query.date as string)
        : new Date();

      const kpi = await this.kpiService.computeDailyKPI(sellerId, date);
      res.json({ success: true, data: kpi });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async computeWeekly(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const weekStart = req.query.weekStart
        ? new Date(req.query.weekStart as string)
        : undefined;

      if (!weekStart) {
        res.status(400).json({ success: false, message: 'weekStart query parameter is required' });
        return;
      }

      const kpi = await this.kpiService.computeWeeklyKPI(sellerId, weekStart);
      res.json({ success: true, data: kpi });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async computeMonthly(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const year = parseInt(req.query.year as string);
      const month = parseInt(req.query.month as string);

      if (!year || !month) {
        res.status(400).json({ success: false, message: 'year and month query parameters are required' });
        return;
      }

      // Create month start date from year and month
      const monthStartDate = new Date(year, month - 1, 1);
      const kpi = await this.kpiService.computeMonthlyKPI(sellerId, monthStartDate);
      res.json({ success: true, data: kpi });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.kpiService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
