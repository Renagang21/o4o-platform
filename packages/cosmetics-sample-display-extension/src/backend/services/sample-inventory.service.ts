/**
 * Sample Inventory Service
 *
 * 샘플 재고 관리
 */

import { Repository, DataSource } from 'typeorm';
import {
  SampleInventory,
  SampleType,
  InventoryStatus,
} from '../entities/sample-inventory.entity';

export interface RecordShipmentDto {
  storeId: string;
  productId: string;
  productName: string;
  supplierId?: string;
  sampleType?: SampleType;
  quantity: number;
  unitCost?: number;
  expiryDate?: Date;
  batchNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordUsageDto {
  storeId: string;
  productId: string;
  quantity: number;
}

export interface InventoryFilter {
  storeId?: string;
  productId?: string;
  supplierId?: string;
  status?: InventoryStatus;
  sampleType?: SampleType;
  lowStockOnly?: boolean;
}

export class SampleInventoryService {
  private repository: Repository<SampleInventory>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SampleInventory);
  }

  /**
   * Record sample shipment (입고)
   */
  async recordShipment(dto: RecordShipmentDto): Promise<SampleInventory> {
    // Check if inventory exists for this store/product combo
    let inventory = await this.repository.findOne({
      where: {
        storeId: dto.storeId,
        productId: dto.productId,
      },
    });

    if (inventory) {
      // Update existing inventory
      inventory.quantityReceived += dto.quantity;
      inventory.quantityRemaining += dto.quantity;
      inventory.lastRefilledAt = new Date();
      inventory.status = this.calculateStatus(inventory.quantityRemaining, inventory.minimumStock);

      if (dto.expiryDate) inventory.expiryDate = dto.expiryDate;
      if (dto.batchNumber) inventory.batchNumber = dto.batchNumber;
      if (dto.unitCost) inventory.unitCost = dto.unitCost;
    } else {
      // Create new inventory record
      inventory = this.repository.create({
        storeId: dto.storeId,
        productId: dto.productId,
        productName: dto.productName,
        supplierId: dto.supplierId,
        sampleType: dto.sampleType || 'trial',
        quantityReceived: dto.quantity,
        quantityRemaining: dto.quantity,
        quantityUsed: 0,
        unitCost: dto.unitCost || 0,
        expiryDate: dto.expiryDate,
        batchNumber: dto.batchNumber,
        lastRefilledAt: new Date(),
        status: 'in_stock',
        metadata: dto.metadata,
      });
    }

    return this.repository.save(inventory);
  }

  /**
   * Record sample usage (사용)
   */
  async recordUsage(dto: RecordUsageDto): Promise<SampleInventory | null> {
    const inventory = await this.repository.findOne({
      where: {
        storeId: dto.storeId,
        productId: dto.productId,
      },
    });

    if (!inventory) {
      return null;
    }

    if (inventory.quantityRemaining < dto.quantity) {
      throw new Error('Insufficient inventory');
    }

    inventory.quantityUsed += dto.quantity;
    inventory.quantityRemaining -= dto.quantity;
    inventory.lastUsedAt = new Date();
    inventory.status = this.calculateStatus(inventory.quantityRemaining, inventory.minimumStock);

    return this.repository.save(inventory);
  }

  /**
   * Get inventory by ID
   */
  async findById(id: string): Promise<SampleInventory | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get inventory for store/product
   */
  async getInventory(storeId: string, productId: string): Promise<SampleInventory | null> {
    return this.repository.findOne({
      where: { storeId, productId },
    });
  }

  /**
   * Get all inventory for a store
   */
  async getStoreInventory(storeId: string): Promise<SampleInventory[]> {
    return this.repository.find({
      where: { storeId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * List inventory with filter
   */
  async findAll(filter: InventoryFilter): Promise<SampleInventory[]> {
    const qb = this.repository.createQueryBuilder('inv');

    if (filter.storeId) {
      qb.andWhere('inv.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.productId) {
      qb.andWhere('inv.productId = :productId', { productId: filter.productId });
    }

    if (filter.supplierId) {
      qb.andWhere('inv.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    if (filter.status) {
      qb.andWhere('inv.status = :status', { status: filter.status });
    }

    if (filter.sampleType) {
      qb.andWhere('inv.sampleType = :sampleType', { sampleType: filter.sampleType });
    }

    if (filter.lowStockOnly) {
      qb.andWhere('inv.quantityRemaining <= inv.minimumStock');
    }

    qb.orderBy('inv.updatedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Check and get items needing refill
   */
  async autoRefillCheck(storeId?: string): Promise<SampleInventory[]> {
    const qb = this.repository.createQueryBuilder('inv');

    qb.where('inv.quantityRemaining <= inv.minimumStock');
    qb.andWhere('inv.status != :outOfStock', { outOfStock: 'out_of_stock' });

    if (storeId) {
      qb.andWhere('inv.storeId = :storeId', { storeId });
    }

    return qb.getMany();
  }

  /**
   * Update minimum stock level
   */
  async setMinimumStock(id: string, minimumStock: number): Promise<SampleInventory | null> {
    const inventory = await this.findById(id);
    if (!inventory) return null;

    inventory.minimumStock = minimumStock;
    inventory.status = this.calculateStatus(inventory.quantityRemaining, minimumStock);

    return this.repository.save(inventory);
  }

  /**
   * Get inventory stats for store
   */
  async getStoreStats(storeId: string): Promise<{
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }> {
    const inventory = await this.getStoreInventory(storeId);

    return {
      totalProducts: inventory.length,
      inStock: inventory.filter((i) => i.status === 'in_stock').length,
      lowStock: inventory.filter((i) => i.status === 'low_stock').length,
      outOfStock: inventory.filter((i) => i.status === 'out_of_stock').length,
      totalValue: inventory.reduce(
        (sum, i) => sum + Number(i.unitCost) * i.quantityRemaining,
        0
      ),
    };
  }

  /**
   * Delete inventory record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private calculateStatus(remaining: number, minimum: number): InventoryStatus {
    if (remaining === 0) return 'out_of_stock';
    if (remaining <= minimum) return 'low_stock';
    return 'in_stock';
  }
}
