/**
 * PharmacyInventoryService
 *
 * 약국 재고 관리 서비스
 * 재고 조회, 업데이트, 자동발주 후보 생성 기능
 *
 * @package @o4o/pharmacyops
 */

import { Repository, LessThan, LessThanOrEqual, MoreThan } from 'typeorm';
import {
  PharmacyInventory,
  InventoryStatus,
  InventoryUpdateSource,
} from '../entities/PharmacyInventory.entity.js';

// ========================================
// DTOs
// ========================================

export interface CreateInventoryDto {
  pharmacyId: string;
  productId: string;
  productName: string;
  productSku?: string;
  currentStock?: number;
  safetyStock?: number;
  minOrderQuantity?: number;
  maxStock?: number;
  averageDailyUsage?: number;
  requiresColdChain?: boolean;
  isNarcotic?: boolean;
  trackExpiry?: boolean;
  nearestExpiryDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInventoryDto {
  currentStock?: number;
  safetyStock?: number;
  minOrderQuantity?: number;
  maxStock?: number;
  averageDailyUsage?: number;
  nearestExpiryDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface AdjustStockDto {
  adjustment: number; // positive = increase, negative = decrease
  source: InventoryUpdateSource;
  reason?: string;
}

export interface InventoryFilter {
  pharmacyId?: string;
  status?: InventoryStatus;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  requiresColdChain?: boolean;
  isNarcotic?: boolean;
  page?: number;
  limit?: number;
}

export interface LowStockItem {
  inventory: PharmacyInventory;
  daysUntilStockout: number | null;
  suggestedOrderQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

// ========================================
// Service
// ========================================

export class PharmacyInventoryService {
  constructor(
    private inventoryRepository: Repository<PharmacyInventory>
  ) {}

  /**
   * 재고 레코드 생성
   */
  async create(data: CreateInventoryDto): Promise<PharmacyInventory> {
    // 중복 체크
    const existing = await this.inventoryRepository.findOne({
      where: {
        pharmacyId: data.pharmacyId,
        productId: data.productId,
      },
    });

    if (existing) {
      throw new Error('Inventory record already exists for this product');
    }

    const inventory = this.inventoryRepository.create({
      ...data,
      currentStock: data.currentStock ?? 0,
      safetyStock: data.safetyStock ?? 10,
      minOrderQuantity: data.minOrderQuantity ?? 1,
      averageDailyUsage: data.averageDailyUsage ?? 0,
      status: this.calculateStatus(
        data.currentStock ?? 0,
        data.safetyStock ?? 10,
        data.maxStock
      ),
      lastUpdateSource: InventoryUpdateSource.MANUAL,
    });

    return this.inventoryRepository.save(inventory);
  }

  /**
   * ID로 재고 조회
   */
  async findById(id: string): Promise<PharmacyInventory | null> {
    return this.inventoryRepository.findOne({ where: { id } });
  }

  /**
   * 약국+제품으로 재고 조회
   */
  async findByPharmacyAndProduct(
    pharmacyId: string,
    productId: string
  ): Promise<PharmacyInventory | null> {
    return this.inventoryRepository.findOne({
      where: { pharmacyId, productId },
    });
  }

  /**
   * 재고 목록 조회
   */
  async findAll(filter: InventoryFilter = {}): Promise<{
    items: PharmacyInventory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50, ...where } = filter;

    const qb = this.inventoryRepository.createQueryBuilder('inv');

    if (where.pharmacyId) {
      qb.andWhere('inv.pharmacyId = :pharmacyId', { pharmacyId: where.pharmacyId });
    }

    if (where.status) {
      qb.andWhere('inv.status = :status', { status: where.status });
    }

    if (where.lowStockOnly) {
      qb.andWhere('inv.currentStock < inv.safetyStock');
    }

    if (where.outOfStockOnly) {
      qb.andWhere('inv.currentStock = 0');
    }

    if (where.requiresColdChain !== undefined) {
      qb.andWhere('inv.requiresColdChain = :requiresColdChain', {
        requiresColdChain: where.requiresColdChain,
      });
    }

    if (where.isNarcotic !== undefined) {
      qb.andWhere('inv.isNarcotic = :isNarcotic', { isNarcotic: where.isNarcotic });
    }

    qb.orderBy('inv.currentStock', 'ASC'); // 재고 적은 순
    qb.addOrderBy('inv.productName', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 재고 업데이트
   */
  async update(
    id: string,
    data: UpdateInventoryDto
  ): Promise<PharmacyInventory | null> {
    const inventory = await this.findById(id);
    if (!inventory) return null;

    Object.assign(inventory, data);

    // 상태 재계산
    inventory.status = this.calculateStatus(
      inventory.currentStock,
      inventory.safetyStock,
      inventory.maxStock
    );
    inventory.lastUpdateSource = InventoryUpdateSource.MANUAL;

    return this.inventoryRepository.save(inventory);
  }

  /**
   * 재고 수량 조정
   */
  async adjustStock(
    id: string,
    data: AdjustStockDto
  ): Promise<PharmacyInventory | null> {
    const inventory = await this.findById(id);
    if (!inventory) return null;

    const newStock = inventory.currentStock + data.adjustment;
    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }

    inventory.currentStock = newStock;
    inventory.status = this.calculateStatus(
      newStock,
      inventory.safetyStock,
      inventory.maxStock
    );
    inventory.lastUpdateSource = data.source;

    // 입고/출고 시간 업데이트
    if (data.adjustment > 0 && data.source === InventoryUpdateSource.ORDER_RECEIVED) {
      inventory.lastReceivedAt = new Date();
    } else if (data.adjustment < 0 && data.source === InventoryUpdateSource.DISPENSED) {
      inventory.lastDispensedAt = new Date();
    }

    // 메모 추가
    if (data.reason) {
      inventory.notes = `${inventory.notes || ''}\n[${new Date().toISOString()}] ${data.reason}`.trim();
    }

    return this.inventoryRepository.save(inventory);
  }

  /**
   * 재고 부족 품목 조회
   */
  async getLowStockItems(pharmacyId: string): Promise<LowStockItem[]> {
    const items = await this.inventoryRepository.find({
      where: {
        pharmacyId,
      },
    });

    const lowStockItems: LowStockItem[] = [];

    for (const inventory of items) {
      if (!inventory.needsReorder) continue;

      const daysUntilStockout = inventory.estimatedDaysUntilStockout;
      const suggestedOrderQuantity = this.calculateSuggestedOrderQuantity(inventory);
      const urgency = this.calculateUrgency(inventory, daysUntilStockout);

      lowStockItems.push({
        inventory,
        daysUntilStockout,
        suggestedOrderQuantity,
        urgency,
      });
    }

    // 긴급도 순 정렬
    return lowStockItems.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * 재고 통계 조회
   */
  async getStats(pharmacyId: string): Promise<{
    totalProducts: number;
    normalStock: number;
    lowStock: number;
    outOfStock: number;
    overstock: number;
    narcoticsCount: number;
    coldChainCount: number;
    expiringWithin30Days: number;
  }> {
    const stats = await this.inventoryRepository
      .createQueryBuilder('inv')
      .select([
        'COUNT(*) as total',
        `SUM(CASE WHEN inv.status = 'normal' THEN 1 ELSE 0 END) as normal`,
        `SUM(CASE WHEN inv.status = 'low' THEN 1 ELSE 0 END) as low`,
        `SUM(CASE WHEN inv.status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock`,
        `SUM(CASE WHEN inv.status = 'overstock' THEN 1 ELSE 0 END) as overstock`,
        `SUM(CASE WHEN inv.isNarcotic = true THEN 1 ELSE 0 END) as narcotics`,
        `SUM(CASE WHEN inv.requiresColdChain = true THEN 1 ELSE 0 END) as cold_chain`,
      ])
      .where('inv.pharmacyId = :pharmacyId', { pharmacyId })
      .getRawOne();

    // 30일 이내 유효기간 만료 제품
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringCount = await this.inventoryRepository.count({
      where: {
        pharmacyId,
        nearestExpiryDate: LessThanOrEqual(thirtyDaysFromNow),
      },
    });

    return {
      totalProducts: parseInt(stats?.total || '0', 10),
      normalStock: parseInt(stats?.normal || '0', 10),
      lowStock: parseInt(stats?.low || '0', 10),
      outOfStock: parseInt(stats?.out_of_stock || '0', 10),
      overstock: parseInt(stats?.overstock || '0', 10),
      narcoticsCount: parseInt(stats?.narcotics || '0', 10),
      coldChainCount: parseInt(stats?.cold_chain || '0', 10),
      expiringWithin30Days: expiringCount,
    };
  }

  /**
   * 일평균 소비량 업데이트 (배치 작업용)
   */
  async updateAverageDailyUsage(
    pharmacyId: string,
    productId: string,
    usage: number
  ): Promise<void> {
    const inventory = await this.findByPharmacyAndProduct(pharmacyId, productId);
    if (!inventory) return;

    // 이동평균 계산 (기존 값과 새 값의 가중 평균)
    const alpha = 0.3; // 새 값의 가중치
    const newAverage =
      alpha * usage + (1 - alpha) * Number(inventory.averageDailyUsage);

    inventory.averageDailyUsage = Math.round(newAverage * 100) / 100;
    inventory.status = this.calculateStatus(
      inventory.currentStock,
      inventory.safetyStock,
      inventory.maxStock
    );

    await this.inventoryRepository.save(inventory);
  }

  /**
   * 대량 재고 생성/업데이트 (초기 설정용)
   */
  async bulkUpsert(
    pharmacyId: string,
    items: Array<Omit<CreateInventoryDto, 'pharmacyId'>>
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const item of items) {
      const existing = await this.findByPharmacyAndProduct(pharmacyId, item.productId);

      if (existing) {
        await this.update(existing.id, {
          currentStock: item.currentStock,
          safetyStock: item.safetyStock,
          averageDailyUsage: item.averageDailyUsage,
        });
        updated++;
      } else {
        await this.create({ ...item, pharmacyId });
        created++;
      }
    }

    return { created, updated };
  }

  // ========================================
  // Private Helpers
  // ========================================

  /**
   * 재고 상태 계산
   */
  private calculateStatus(
    currentStock: number,
    safetyStock: number,
    maxStock?: number
  ): InventoryStatus {
    if (currentStock === 0) {
      return InventoryStatus.OUT_OF_STOCK;
    }
    if (currentStock < safetyStock) {
      return InventoryStatus.LOW;
    }
    if (maxStock && currentStock > maxStock) {
      return InventoryStatus.OVERSTOCK;
    }
    return InventoryStatus.NORMAL;
  }

  /**
   * 권장 주문 수량 계산
   * requiredQuantity = (ASU * leadTimeDays) + safetyStock - currentStock
   */
  private calculateSuggestedOrderQuantity(
    inventory: PharmacyInventory,
    leadTimeDays: number = 3
  ): number {
    const asu = Number(inventory.averageDailyUsage);
    const required =
      asu * leadTimeDays + inventory.safetyStock - inventory.currentStock;

    // 최소 주문 수량 적용
    const quantity = Math.max(required, inventory.minOrderQuantity);

    // 최대 재고를 초과하지 않도록 조정
    if (inventory.maxStock) {
      const maxOrder = inventory.maxStock - inventory.currentStock;
      return Math.min(quantity, Math.max(maxOrder, 0));
    }

    return Math.ceil(quantity);
  }

  /**
   * 긴급도 계산
   */
  private calculateUrgency(
    inventory: PharmacyInventory,
    daysUntilStockout: number | null
  ): 'critical' | 'high' | 'medium' | 'low' {
    // 재고 소진
    if (inventory.currentStock === 0) {
      return 'critical';
    }

    // 마약류는 우선순위 높음
    if (inventory.isNarcotic && inventory.isLowStock) {
      return 'high';
    }

    // 1일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 1) {
      return 'critical';
    }

    // 3일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 3) {
      return 'high';
    }

    // 7일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 7) {
      return 'medium';
    }

    // 안전재고 미만
    if (inventory.isLowStock) {
      return 'medium';
    }

    return 'low';
  }
}
