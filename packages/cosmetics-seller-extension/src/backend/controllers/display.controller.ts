/**
 * DisplayController
 *
 * 매장 진열 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { DisplayService, CreateDisplayDto, UpdateDisplayDto } from '../services/display.service.js';

export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateDisplayDto = req.body;
      const display = await this.displayService.create(dto);
      res.status(201).json({ success: true, data: display });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateDisplayDto = req.body;
      const display = await this.displayService.update(id, dto);
      res.json({ success: true, data: display });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const display = await this.displayService.findById(id);
      if (!display) {
        res.status(404).json({ success: false, message: 'Display not found' });
        return;
      }
      res.json({ success: true, data: display });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySellerId(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const displays = await this.displayService.findBySellerId(sellerId);
      res.json({ success: true, data: displays });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByFilter(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        sellerId: req.query.sellerId as string,
        productId: req.query.productId as string,
        location: req.query.location as any,
        isActive: req.query.isActive === 'true',
      };
      const displays = await this.displayService.findByFilter(filter);
      res.json({ success: true, data: displays });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.displayService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const stats = await this.displayService.getDisplayStats(sellerId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
