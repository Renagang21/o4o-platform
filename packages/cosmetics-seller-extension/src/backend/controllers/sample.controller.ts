/**
 * SampleController
 *
 * 매장 샘플 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { SampleService, CreateSampleDto, RefillSampleDto, UseSampleDto } from '../services/sample.service.js';

export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateSampleDto = req.body;
      const sample = await this.sampleService.create(dto);
      res.status(201).json({ success: true, data: sample });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sample = await this.sampleService.findById(id);
      if (!sample) {
        res.status(404).json({ success: false, message: 'Sample not found' });
        return;
      }
      res.json({ success: true, data: sample });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySellerId(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const samples = await this.sampleService.findBySellerId(sellerId);
      res.json({ success: true, data: samples });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async refillSample(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: RefillSampleDto = req.body;
      const sample = await this.sampleService.refillSample(id, dto);
      res.json({ success: true, data: sample });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async useSample(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UseSampleDto = req.body;
      const sample = await this.sampleService.useSample(id, dto);
      res.json({ success: true, data: sample });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const samples = await this.sampleService.getLowStockSamples(sellerId);
      res.json({ success: true, data: samples });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const stats = await this.sampleService.getSampleStats(sellerId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.sampleService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
