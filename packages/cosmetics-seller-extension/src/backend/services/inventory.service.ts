/**
 * InventoryService
 *
 * 매장 재고 관리 서비스
 */

import type { Repository } from 'typeorm';
import {
  SellerInventory,
  AdjustmentReason,
  StockAdjustment,
} from '../entities/seller-inventory.entity.js';

export interface CreateInventoryDto {
  sellerId: string;
  productId: string;
  quantity: number;
  reorderLevel?: number;
  maxStockLevel?: number;
  metadata?: Record<string, unknown>;
}

export interface AdjustStockDto {
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
  adjustedBy?: string;
}

export interface InventoryFilter {
  sellerId?: string;
  productId?: string;
  lowStock?: boolean;
  isActive?: boolean;
}

export class InventoryService {
  constructor(private readonly inventoryRepository: Repository<SellerInventory>) {}

  async create(dto: CreateInventoryDto): Promise<SellerInventory> {
    const existing = await this.inventoryRepository.findOne({
      where: {
        sellerId: dto.sellerId,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new Error('Inventory record already exists for this product');
    }

    const inventory = this.inventoryRepository.create({
      ...dto,
      adjustmentHistory: [],
      isActive: true,
    });

    return this.inventoryRepository.save(inventory);
  }

  async findById(id: string): Promise<SellerInventory | null> {
    return this.inventoryRepository.findOne({ where: { id } });
  }

  async findBySellerId(sellerId: string): Promise<SellerInventory[]> {
    return this.inventoryRepository.find({
      where: { sellerId, isActive: true },
      order: { quantity: 'ASC' },
    });
  }

  async findBySellerAndProduct(sellerId: string, productId: string): Promise<SellerInventory | null> {
    return this.inventoryRepository.findOne({
      where: { sellerId, productId, isActive: true },
    });
  }

  async adjustStock(id: string, dto: AdjustStockDto): Promise<SellerInventory> {
    const inventory = await this.findById(id);
    if (!inventory) {
      throw new Error('Inventory not found');
    }

    const previousQuantity = inventory.quantity;
    let newQuantity: number;

    // Calculate new quantity based on reason
    switch (dto.reason) {
      case 'sale':
      case 'damage':
        newQuantity = previousQuantity - Math.abs(dto.quantity);
        break;
      case 'return':
      case 'restock':
        newQuantity = previousQuantity + Math.abs(dto.quantity);
        break;
      case 'audit':
      case 'other':
        newQuantity = dto.quantity; // Direct set for audit
        break;
      default:
        newQuantity = previousQuantity + dto.quantity;
    }

    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }

    const adjustment: StockAdjustment = {
      date: new Date().toISOString(),
      previousQuantity,
      newQuantity,
      reason: dto.reason,
      notes: dto.notes,
      adjustedBy: dto.adjustedBy,
    };

    inventory.quantity = newQuantity;
    inventory.adjustmentHistory = [...(inventory.adjustmentHistory || []), adjustment];

    if (dto.reason === 'restock') {
      inventory.lastRestockedAt = new Date();
    }
    if (dto.reason === 'audit') {
      inventory.lastAuditedAt = new Date();
    }

    return this.inventoryRepository.save(inventory);
  }

  async getLowStockItems(sellerId: string): Promise<SellerInventory[]> {
    return this.inventoryRepository
      .createQueryBuilder('inv')
      .where('inv.sellerId = :sellerId', { sellerId })
      .andWhere('inv.isActive = true')
      .andWhere('inv.quantity <= inv.reorderLevel')
      .orderBy('inv.quantity', 'ASC')
      .getMany();
  }

  async getInventoryStats(sellerId: string): Promise<{
    totalProducts: number;
    totalQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
    recentAdjustments: number;
  }> {
    const inventory = await this.findBySellerId(sellerId);

    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let recentAdjustments = 0;

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    for (const item of inventory) {
      totalQuantity += item.quantity;

      if (item.quantity === 0) {
        outOfStockCount++;
      } else if (item.quantity <= item.reorderLevel) {
        lowStockCount++;
      }

      // Count recent adjustments
      for (const adj of item.adjustmentHistory || []) {
        if (new Date(adj.date) >= oneDayAgo) {
          recentAdjustments++;
        }
      }
    }

    return {
      totalProducts: inventory.length,
      totalQuantity,
      lowStockCount,
      outOfStockCount,
      recentAdjustments,
    };
  }

  async bulkRestock(
    sellerId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<SellerInventory[]> {
    const results: SellerInventory[] = [];

    for (const item of items) {
      const inventory = await this.findBySellerAndProduct(sellerId, item.productId);
      if (inventory) {
        const updated = await this.adjustStock(inventory.id, {
          quantity: item.quantity,
          reason: 'restock',
          notes: 'Bulk restock',
        });
        results.push(updated);
      }
    }

    return results;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.inventoryRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
