/**
 * InventoryController
 *
 * 매장 재고 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { InventoryService, CreateInventoryDto, AdjustStockDto } from '../services/inventory.service.js';

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateInventoryDto = req.body;
      const inventory = await this.inventoryService.create(dto);
      res.status(201).json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const inventory = await this.inventoryService.findById(id);
      if (!inventory) {
        res.status(404).json({ success: false, message: 'Inventory not found' });
        return;
      }
      res.json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findBySellerId(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const inventory = await this.inventoryService.findBySellerId(sellerId);
      res.json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: AdjustStockDto = req.body;
      const inventory = await this.inventoryService.adjustStock(id, dto);
      res.json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const inventory = await this.inventoryService.getLowStockItems(sellerId);
      res.json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const stats = await this.inventoryService.getInventoryStats(sellerId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async bulkRestock(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { items } = req.body;
      const results = await this.inventoryService.bulkRestock(sellerId, items);
      res.json({ success: true, data: results });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.inventoryService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
