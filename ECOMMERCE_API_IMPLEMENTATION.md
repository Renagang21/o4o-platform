# E-commerce 시스템 API 구현 작업 지시서

## 📋 작업 개요
O4O Platform의 E-commerce 시스템 백엔드 API를 완성하는 작업입니다.
현재 프론트엔드 UI(85%)와 데이터베이스 설계(90%)는 완성되었으나, API 연동 및 고급 기능 구현이 필요합니다.

## 🎯 작업 목표
1. 재고 관리 시스템 고도화 (자동 재주문, 알림)
2. 분석 및 보고서 API 구현
3. Toss Payments 고급 기능 구현 (정기결제, 부분취소)
4. 주문 자동화 워크플로우 구현

## 📁 현재 파일 구조
```
apps/api-server/src/
├── entities/
│   ├── Product.ts (✅ 완성)
│   ├── Order.ts (✅ 완성)
│   ├── Payment.ts (✅ 완성)
│   └── Inventory.ts (❌ 생성 필요)
├── services/
│   ├── TossPaymentsService.ts (🔶 확장 필요)
│   ├── InventoryService.ts (❌ 생성 필요)
│   ├── AnalyticsService.ts (❌ 생성 필요)
│   └── OrderAutomationService.ts (🔶 확장 필요)
└── controllers/
    ├── inventoryController.ts (❌ 생성 필요)
    └── analyticsController.ts (❌ 생성 필요)
```

## 🔧 Phase 1: 재고 관리 시스템 구현

### 1.1 Inventory 엔티티 생성
**파일 위치**: `apps/api-server/src/entities/Inventory.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Product } from './Product';
import { ProductVariation } from './ProductVariation';

@Entity('inventory')
@Index(['product', 'variation'])
@Index(['lastUpdated'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, product => product.inventory)
  product: Product;

  @ManyToOne(() => ProductVariation, { nullable: true })
  variation?: ProductVariation;

  @Column('int')
  currentStock: number;

  @Column('int', { default: 0 })
  reservedStock: number; // 주문 진행 중인 재고

  @Column('int', { default: 0 })
  incomingStock: number; // 입고 예정 재고

  @Column('int')
  reorderPoint: number; // 재주문점

  @Column('int')
  reorderQuantity: number; // 재주문 수량

  @Column('int', { nullable: true })
  maxStock?: number; // 최대 재고

  @Column('int', { nullable: true })
  minStock?: number; // 최소 재고

  @Column('decimal', { precision: 10, scale: 2 })
  unitCost: number; // 단위 원가

  @Column({ nullable: true })
  location?: string; // 창고 위치

  @Column({ nullable: true })
  batch?: string; // 배치 번호

  @Column({ type: 'date', nullable: true })
  expiryDate?: Date; // 유효기한

  @Column({
    type: 'enum',
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  })
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';

  @Column({ type: 'timestamp' })
  lastRestocked: Date;

  @Column({ type: 'timestamp' })
  lastSold: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;

  @OneToMany(() => StockMovement, movement => movement.inventory)
  movements: StockMovement[];

  @OneToMany(() => ReorderRule, rule => rule.inventory)
  reorderRules: ReorderRule[];

  // 가용 재고 계산
  get availableStock(): number {
    return this.currentStock - this.reservedStock;
  }

  // 재주문 필요 여부
  get needsReorder(): boolean {
    return this.availableStock <= this.reorderPoint;
  }
}

@Entity('stock_movements')
@Index(['inventory', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventory, inventory => inventory.movements)
  inventory: Inventory;

  @Column({
    type: 'enum',
    enum: ['in', 'out', 'adjustment', 'reserved', 'unreserved', 'expired', 'damaged'],
  })
  type: string;

  @Column('int')
  quantity: number;

  @Column('int')
  previousStock: number;

  @Column('int')
  newStock: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  reference?: string; // Order ID, PO ID 등

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  performedBy: string; // User ID

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('reorder_rules')
export class ReorderRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventory, inventory => inventory.reorderRules)
  inventory: Inventory;

  @Column({ default: true })
  enabled: boolean;

  @Column('int')
  reorderPoint: number;

  @Column('int')
  reorderQuantity: number;

  @Column('int')
  leadTime: number; // 리드타임 (일)

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  supplierName?: string;

  @Column({ default: false })
  autoApprove: boolean;

  @Column({
    type: 'enum',
    enum: ['fixed', 'dynamic', 'seasonal'],
    default: 'fixed'
  })
  calculationMethod: 'fixed' | 'dynamic' | 'seasonal';

  @Column('decimal', { precision: 5, scale: 2, default: 1.5 })
  safetyStockMultiplier: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggered?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('inventory_alerts')
export class InventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventory)
  inventory: Inventory;

  @Column({
    type: 'enum',
    enum: ['low_stock', 'out_of_stock', 'expiring', 'overstock', 'slow_moving'],
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['critical', 'warning', 'info'],
  })
  severity: 'critical' | 'warning' | 'info';

  @Column()
  message: string;

  @Column('text')
  recommendation: string;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ nullable: true })
  acknowledgedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 1.2 InventoryService 구현
**파일 위치**: `apps/api-server/src/services/InventoryService.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inventory, StockMovement, ReorderRule, InventoryAlert } from '../entities/Inventory';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { EventEmitter2 } from '@nestjs/event-emitter';
import logger from '../utils/simpleLogger';

interface StockAdjustmentDto {
  inventoryId: string;
  type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  performedBy: string;
}

interface ReorderRuleDto {
  productId: string;
  reorderPoint: number;
  reorderQuantity: number;
  leadTime: number;
  supplierId?: string;
  autoApprove?: boolean;
  calculationMethod?: 'fixed' | 'dynamic' | 'seasonal';
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(ReorderRule)
    private reorderRuleRepository: Repository<ReorderRule>,
    @InjectRepository(InventoryAlert)
    private alertRepository: Repository<InventoryAlert>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private eventEmitter: EventEmitter2,
  ) {}

  // 재고 조회
  async getInventory(filters?: any) {
    const query = this.inventoryRepository.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.variation', 'variation');

    if (filters?.status) {
      query.andWhere('inventory.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', 
        { search: `%${filters.search}%` });
    }

    if (filters?.lowStock) {
      query.andWhere('inventory.currentStock <= inventory.reorderPoint');
    }

    return query.getMany();
  }

  // 재고 조정
  async adjustStock(adjustment: StockAdjustmentDto) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id: adjustment.inventoryId },
      relations: ['product']
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다');
    }

    const previousStock = inventory.currentStock;
    let newStock: number;
    let movementType: string;

    switch (adjustment.type) {
      case 'increase':
        newStock = previousStock + adjustment.quantity;
        movementType = 'in';
        break;
      case 'decrease':
        newStock = previousStock - adjustment.quantity;
        movementType = 'out';
        if (newStock < 0) {
          throw new BadRequestException('재고가 부족합니다');
        }
        break;
      case 'set':
        newStock = adjustment.quantity;
        movementType = 'adjustment';
        break;
    }

    // 재고 업데이트
    inventory.currentStock = newStock;
    inventory.status = this.calculateStockStatus(inventory);
    await this.inventoryRepository.save(inventory);

    // 재고 이동 기록
    const movement = this.movementRepository.create({
      inventory,
      type: movementType,
      quantity: Math.abs(newStock - previousStock),
      previousStock,
      newStock,
      reason: adjustment.reason,
      notes: adjustment.notes,
      performedBy: adjustment.performedBy
    });
    await this.movementRepository.save(movement);

    // 이벤트 발생
    this.eventEmitter.emit('inventory.adjusted', {
      inventoryId: inventory.id,
      productId: inventory.product.id,
      previousStock,
      newStock,
      adjustment
    });

    // 알림 확인
    await this.checkAndCreateAlerts(inventory);

    return inventory;
  }

  // 주문 시 재고 예약
  async reserveStock(productId: string, quantity: number, orderId: string) {
    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: productId } }
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다');
    }

    if (inventory.availableStock < quantity) {
      throw new BadRequestException('재고가 부족합니다');
    }

    inventory.reservedStock += quantity;
    await this.inventoryRepository.save(inventory);

    // 예약 기록
    const movement = this.movementRepository.create({
      inventory,
      type: 'reserved',
      quantity,
      previousStock: inventory.currentStock,
      newStock: inventory.currentStock,
      reason: '주문 예약',
      reference: orderId,
      performedBy: 'system'
    });
    await this.movementRepository.save(movement);

    return inventory;
  }

  // 주문 완료 시 재고 차감
  async deductStock(productId: string, quantity: number, orderId: string) {
    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: productId } }
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다');
    }

    inventory.currentStock -= quantity;
    inventory.reservedStock = Math.max(0, inventory.reservedStock - quantity);
    inventory.lastSold = new Date();
    inventory.status = this.calculateStockStatus(inventory);
    
    await this.inventoryRepository.save(inventory);

    // 차감 기록
    const movement = this.movementRepository.create({
      inventory,
      type: 'out',
      quantity,
      previousStock: inventory.currentStock + quantity,
      newStock: inventory.currentStock,
      reason: '주문 완료',
      reference: orderId,
      performedBy: 'system'
    });
    await this.movementRepository.save(movement);

    // 재주문 확인
    if (inventory.needsReorder) {
      await this.triggerReorder(inventory);
    }

    return inventory;
  }

  // 재주문 규칙 생성/업데이트
  async upsertReorderRule(ruleDto: ReorderRuleDto) {
    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: ruleDto.productId } }
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다');
    }

    let rule = await this.reorderRuleRepository.findOne({
      where: { inventory: { id: inventory.id } }
    });

    if (!rule) {
      rule = this.reorderRuleRepository.create({
        inventory,
        ...ruleDto
      });
    } else {
      Object.assign(rule, ruleDto);
    }

    // 동적 계산 방식일 경우 재주문점 재계산
    if (rule.calculationMethod === 'dynamic') {
      rule.reorderPoint = await this.calculateDynamicReorderPoint(inventory);
    }

    return this.reorderRuleRepository.save(rule);
  }

  // 자동 재주문 트리거
  private async triggerReorder(inventory: Inventory) {
    const rule = await this.reorderRuleRepository.findOne({
      where: { inventory: { id: inventory.id }, enabled: true }
    });

    if (!rule) return;

    // 이미 최근에 트리거된 경우 스킵
    if (rule.lastTriggered) {
      const hoursSinceLastTrigger = (Date.now() - rule.lastTriggered.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < 24) return;
    }

    // 구매 주문 생성
    const purchaseOrder = {
      supplierId: rule.supplierId,
      productId: inventory.product.id,
      quantity: rule.reorderQuantity,
      expectedDelivery: new Date(Date.now() + rule.leadTime * 24 * 60 * 60 * 1000),
      autoGenerated: true,
      status: rule.autoApprove ? 'approved' : 'pending'
    };

    // 이벤트 발생
    this.eventEmitter.emit('reorder.triggered', {
      inventory,
      rule,
      purchaseOrder
    });

    // 규칙 업데이트
    rule.lastTriggered = new Date();
    await this.reorderRuleRepository.save(rule);

    // 알림 생성
    await this.createAlert(inventory, 'low_stock', 'warning', 
      `${inventory.product.name}의 재고가 재주문점에 도달했습니다. 자동 재주문이 생성되었습니다.`);

    logger.info(`Auto reorder triggered for product ${inventory.product.id}`);
  }

  // 재고 상태 계산
  private calculateStockStatus(inventory: Inventory): 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' {
    if (inventory.currentStock === 0) return 'out_of_stock';
    if (inventory.currentStock <= inventory.reorderPoint) return 'low_stock';
    return 'in_stock';
  }

  // 동적 재주문점 계산
  private async calculateDynamicReorderPoint(inventory: Inventory): Promise<number> {
    // 최근 30일 판매 데이터 기반 계산
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const movements = await this.movementRepository.find({
      where: {
        inventory: { id: inventory.id },
        type: 'out',
        createdAt: MoreThan(thirtyDaysAgo)
      }
    });

    const totalSold = movements.reduce((sum, m) => sum + m.quantity, 0);
    const avgDailyUsage = totalSold / 30;
    
    const rule = await this.reorderRuleRepository.findOne({
      where: { inventory: { id: inventory.id } }
    });

    const leadTime = rule?.leadTime || 7;
    const safetyStock = avgDailyUsage * (rule?.safetyStockMultiplier || 1.5);

    return Math.ceil((avgDailyUsage * leadTime) + safetyStock);
  }

  // 알림 생성 및 확인
  private async checkAndCreateAlerts(inventory: Inventory) {
    // 재고 부족 알림
    if (inventory.status === 'out_of_stock') {
      await this.createAlert(inventory, 'out_of_stock', 'critical', 
        `${inventory.product.name}의 재고가 소진되었습니다.`);
    } else if (inventory.status === 'low_stock') {
      await this.createAlert(inventory, 'low_stock', 'warning',
        `${inventory.product.name}의 재고가 부족합니다. (현재: ${inventory.currentStock}개)`);
    }

    // 유효기한 알림
    if (inventory.expiryDate) {
      const daysUntilExpiry = (inventory.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 30) {
        await this.createAlert(inventory, 'expiring', 'warning',
          `${inventory.product.name}의 유효기한이 ${Math.floor(daysUntilExpiry)}일 남았습니다.`);
      }
    }

    // 과재고 알림
    if (inventory.maxStock && inventory.currentStock > inventory.maxStock) {
      await this.createAlert(inventory, 'overstock', 'info',
        `${inventory.product.name}의 재고가 최대 수준을 초과했습니다.`);
    }
  }

  private async createAlert(inventory: Inventory, type: string, severity: 'critical' | 'warning' | 'info', message: string) {
    // 동일한 미해결 알림이 있는지 확인
    const existingAlert = await this.alertRepository.findOne({
      where: {
        inventory: { id: inventory.id },
        type,
        resolved: false
      }
    });

    if (existingAlert) return;

    const alert = this.alertRepository.create({
      inventory,
      type,
      severity,
      message,
      recommendation: this.getRecommendation(type, inventory)
    });

    await this.alertRepository.save(alert);

    // 중요 알림은 이메일 전송
    if (severity === 'critical') {
      this.eventEmitter.emit('alert.critical', alert);
    }
  }

  private getRecommendation(type: string, inventory: Inventory): string {
    switch (type) {
      case 'out_of_stock':
        return '즉시 재주문을 진행하거나 대체 상품을 준비하세요.';
      case 'low_stock':
        return `재주문을 준비하세요. 권장 재주문량: ${inventory.reorderQuantity}개`;
      case 'expiring':
        return '할인 프로모션을 진행하거나 반품 처리를 고려하세요.';
      case 'overstock':
        return '프로모션을 통해 재고를 줄이거나 재주문 규칙을 조정하세요.';
      default:
        return '재고 상태를 확인하고 적절한 조치를 취하세요.';
    }
  }

  // 정기 작업: 재고 상태 확인 (매시간)
  @Cron(CronExpression.EVERY_HOUR)
  async checkInventoryStatus() {
    const inventories = await this.inventoryRepository.find({
      relations: ['product']
    });

    for (const inventory of inventories) {
      // 상태 업데이트
      const oldStatus = inventory.status;
      inventory.status = this.calculateStockStatus(inventory);
      
      if (oldStatus !== inventory.status) {
        await this.inventoryRepository.save(inventory);
        await this.checkAndCreateAlerts(inventory);
      }

      // 재주문 확인
      if (inventory.needsReorder) {
        await this.triggerReorder(inventory);
      }
    }

    logger.info('Inventory status check completed');
  }

  // 재고 회전율 계산
  async calculateTurnoverRate(productId: string, period: number = 365): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: productId } }
    });

    if (!inventory) return 0;

    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    const movements = await this.movementRepository.find({
      where: {
        inventory: { id: inventory.id },
        type: 'out',
        createdAt: MoreThan(startDate)
      }
    });

    const totalSold = movements.reduce((sum, m) => sum + m.quantity, 0);
    const avgInventory = (inventory.currentStock + inventory.maxStock) / 2;

    return avgInventory > 0 ? totalSold / avgInventory : 0;
  }

  // 재고 가치 계산
  async calculateInventoryValue(): Promise<number> {
    const inventories = await this.inventoryRepository.find();
    return inventories.reduce((total, inv) => total + (inv.currentStock * inv.unitCost), 0);
  }

  // 데드스톡 식별
  async identifyDeadStock(days: number = 90): Promise<Inventory[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.inventoryRepository.find({
      where: {
        lastSold: LessThanOrEqual(cutoffDate),
        currentStock: MoreThan(0)
      },
      relations: ['product']
    });
  }

  // 재고 예측
  async forecastInventory(productId: string, days: number = 30): Promise<any> {
    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: productId } },
      relations: ['product']
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다');
    }

    // 과거 판매 데이터 분석
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const movements = await this.movementRepository.find({
      where: {
        inventory: { id: inventory.id },
        type: 'out',
        createdAt: MoreThan(thirtyDaysAgo)
      }
    });

    const totalSold = movements.reduce((sum, m) => sum + m.quantity, 0);
    const avgDailyUsage = totalSold / 30;
    
    // 예측 계산
    const forecast = [];
    let projectedStock = inventory.currentStock;
    
    for (let i = 1; i <= days; i++) {
      projectedStock -= avgDailyUsage;
      
      // 재주문 예정이 있는 경우
      if (projectedStock <= inventory.reorderPoint && i % 7 === 0) {
        projectedStock += inventory.reorderQuantity;
      }
      
      forecast.push({
        day: i,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        projectedStock: Math.max(0, projectedStock),
        willReorder: projectedStock <= inventory.reorderPoint
      });
    }

    return {
      product: inventory.product,
      currentStock: inventory.currentStock,
      avgDailyUsage,
      daysUntilOutOfStock: Math.floor(inventory.currentStock / avgDailyUsage),
      forecast
    };
  }
}
```

## 🔧 Phase 2: 분석 서비스 구현

### 2.1 AnalyticsService 구현
**파일 위치**: `apps/api-server/src/services/AnalyticsService.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { Payment } from '../entities/Payment';
import { Inventory } from '../entities/Inventory';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

interface DateRange {
  start: Date;
  end: Date;
}

interface RevenueAnalytics {
  current: number;
  previous: number;
  growth: number;
  chart: Array<{ date: string; value: number }>;
}

interface ProductAnalytics {
  topSelling: Array<any>;
  lowStock: Array<any>;
  categories: Array<any>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // 대시보드 통계
  async getDashboardStats(period: string = 'month') {
    const cacheKey = `dashboard-stats-${period}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(period);
    const { previousStart, previousEnd } = this.getPreviousDateRange(period);

    // 현재 기간 매출
    const currentRevenue = await this.calculateRevenue(start, end);
    const previousRevenue = await this.calculateRevenue(previousStart, previousEnd);
    const revenueGrowth = this.calculateGrowthRate(currentRevenue, previousRevenue);

    // 주문 통계
    const orderStats = await this.getOrderStats(start, end);
    
    // 고객 통계
    const customerStats = await this.getCustomerStats(start, end);

    // 상품 통계
    const productStats = await this.getProductStats(start, end);

    const stats = {
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        growth: revenueGrowth,
        chart: await this.getRevenueChart(start, end)
      },
      orders: orderStats,
      customers: customerStats,
      products: productStats,
      inventory: await this.getInventoryStats()
    };

    // 캐시 저장 (5분)
    await this.cacheManager.set(cacheKey, stats, 300000);
    
    return stats;
  }

  // 매출 계산
  private async calculateRevenue(start: Date, end: Date): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: 'completed' })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne();
    
    return result?.total || 0;
  }

  // 매출 차트 데이터
  private async getRevenueChart(start: Date, end: Date) {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const chart = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const revenue = await this.calculateRevenue(dayStart, dayEnd);
      
      chart.push({
        date: dayStart.toLocaleDateString(),
        value: revenue
      });
    }

    return chart;
  }

  // 주문 통계
  private async getOrderStats(start: Date, end: Date) {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(start, end)
      }
    });

    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => ['pending', 'processing'].includes(o.status)).length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    
    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      total: orders.length,
      completed,
      pending,
      cancelled,
      averageValue: orders.length > 0 ? totalRevenue / completed : 0,
      chart: await this.getOrderChart(start, end)
    };
  }

  // 고객 통계
  private async getCustomerStats(start: Date, end: Date) {
    const totalCustomers = await this.userRepository.count({
      where: { role: 'customer' }
    });

    const newCustomers = await this.userRepository.count({
      where: {
        role: 'customer',
        createdAt: Between(start, end)
      }
    });

    // 재구매 고객 계산
    const returningCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.userId)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('order.userId')
      .having('COUNT(order.id) > 1')
      .getRawOne();

    // 고객 세그먼트
    const segments = await this.getCustomerSegments();

    return {
      total: totalCustomers,
      new: newCustomers,
      returning: returningCustomers?.count || 0,
      churnRate: await this.calculateChurnRate(start, end),
      lifetime: await this.calculateCustomerLifetimeValue(),
      segments
    };
  }

  // 상품 통계
  private async getProductStats(start: Date, end: Date) {
    // 베스트셀러
    const topSelling = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.orderItems', 'item')
      .leftJoin('item.product', 'product')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('SUM(item.quantity)', 'sales')
      .addSelect('SUM(item.price * item.quantity)', 'revenue')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status = :status', { status: 'completed' })
      .groupBy('product.id')
      .orderBy('sales', 'DESC')
      .limit(5)
      .getRawMany();

    // 재고 부족 상품
    const lowStock = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.currentStock <= inventory.reorderPoint')
      .orderBy('inventory.currentStock', 'ASC')
      .limit(5)
      .getMany();

    // 카테고리별 판매
    const categories = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.orderItems', 'item')
      .leftJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .select('category.name', 'name')
      .addSelect('SUM(item.quantity)', 'sales')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status = :status', { status: 'completed' })
      .groupBy('category.id')
      .getRawMany();

    const totalSales = categories.reduce((sum, c) => sum + parseInt(c.sales), 0);
    const categoriesWithPercentage = categories.map(c => ({
      ...c,
      percentage: (parseInt(c.sales) / totalSales) * 100
    }));

    return {
      topSelling,
      lowStock: lowStock.map(inv => ({
        id: inv.product.id,
        name: inv.product.name,
        stock: inv.currentStock,
        reorderPoint: inv.reorderPoint
      })),
      categories: categoriesWithPercentage
    };
  }

  // 재고 통계
  private async getInventoryStats() {
    const inventories = await this.inventoryRepository.find();
    
    const totalValue = inventories.reduce((sum, inv) => 
      sum + (inv.currentStock * inv.unitCost), 0);
    
    const avgTurnoverRate = await this.calculateAverageTurnoverRate();
    
    const deadStock = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.lastSold < :date', { 
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
      })
      .andWhere('inventory.currentStock > 0')
      .getMany();
    
    const deadStockValue = deadStock.reduce((sum, inv) => 
      sum + (inv.currentStock * inv.unitCost), 0);

    return {
      totalValue,
      turnoverRate: avgTurnoverRate,
      deadStock: deadStockValue,
      avgDaysToSell: await this.calculateAverageDaysToSell()
    };
  }

  // 고객 세그먼트 분석
  private async getCustomerSegments() {
    const segments = [
      { segment: 'VIP', minOrders: 10, minSpent: 1000000 },
      { segment: '일반', minOrders: 3, minSpent: 100000 },
      { segment: '신규', minOrders: 0, minSpent: 0 }
    ];

    const result = [];
    
    for (const segment of segments) {
      const customers = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.orders', 'order')
        .select('COUNT(DISTINCT user.id)', 'count')
        .addSelect('SUM(order.totalAmount)', 'value')
        .where('order.status = :status', { status: 'completed' })
        .groupBy('user.id')
        .having('COUNT(order.id) >= :minOrders', { minOrders: segment.minOrders })
        .andHaving('SUM(order.totalAmount) >= :minSpent', { minSpent: segment.minSpent })
        .getRawOne();

      result.push({
        segment: segment.segment,
        count: customers?.count || 0,
        value: customers?.value || 0
      });
    }

    return result;
  }

  // 이탈률 계산
  private async calculateChurnRate(start: Date, end: Date): Promise<number> {
    const activeCustomersPrevious = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.userId)', 'count')
      .where('order.createdAt < :start', { start })
      .getRawOne();

    const activeCustomersCurrent = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.userId)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne();

    if (!activeCustomersPrevious?.count) return 0;
    
    const churnedCustomers = activeCustomersPrevious.count - activeCustomersCurrent.count;
    return (churnedCustomers / activeCustomersPrevious.count) * 100;
  }

  // 고객 생애 가치 계산
  private async calculateCustomerLifetimeValue(): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('AVG(subquery.total)', 'ltv')
      .from(subquery => {
        return subquery
          .select('SUM(order.totalAmount)', 'total')
          .from(Order, 'order')
          .where('order.status = :status', { status: 'completed' })
          .groupBy('order.userId');
      }, 'subquery')
      .getRawOne();

    return result?.ltv || 0;
  }

  // 평균 재고 회전율
  private async calculateAverageTurnoverRate(): Promise<number> {
    const inventories = await this.inventoryRepository.find();
    let totalRate = 0;
    let count = 0;

    for (const inventory of inventories) {
      const movements = await this.movementRepository.find({
        where: {
          inventory: { id: inventory.id },
          type: 'out',
          createdAt: MoreThan(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
        }
      });

      const totalSold = movements.reduce((sum, m) => sum + m.quantity, 0);
      if (inventory.currentStock > 0) {
        totalRate += totalSold / inventory.currentStock;
        count++;
      }
    }

    return count > 0 ? totalRate / count : 0;
  }

  // 평균 판매 소요일
  private async calculateAverageDaysToSell(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const orders = await this.orderRepository.find({
      where: {
        status: 'completed',
        createdAt: MoreThan(thirtyDaysAgo)
      },
      relations: ['orderItems', 'orderItems.product']
    });

    if (orders.length === 0) return 0;

    let totalDays = 0;
    let count = 0;

    for (const order of orders) {
      for (const item of order.orderItems) {
        const product = item.product;
        // 제품 등록일부터 판매일까지의 일수 계산
        const daysToSell = Math.ceil(
          (order.createdAt.getTime() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDays += daysToSell;
        count++;
      }
    }

    return count > 0 ? Math.round(totalDays / count) : 0;
  }

  // 날짜 범위 계산
  private getDateRange(period: string): DateRange {
    const end = new Date();
    let start: Date;

    switch (period) {
      case 'today':
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        break;
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(end.getMonth() / 3) * 3;
        start = new Date(end.getFullYear(), quarterMonth, 1);
        break;
      case 'year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(end.getFullYear(), end.getMonth(), 1);
    }

    return { start, end };
  }

  private getPreviousDateRange(period: string): DateRange {
    const { start, end } = this.getDateRange(period);
    const duration = end.getTime() - start.getTime();
    
    return {
      previousStart: new Date(start.getTime() - duration),
      previousEnd: new Date(start.getTime() - 1)
    };
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // 보고서 생성
  async generateReport(type: string, period: string, format: 'json' | 'csv' | 'pdf' = 'json') {
    const data = await this.getDashboardStats(period);
    
    switch (format) {
      case 'json':
        return data;
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        return this.generatePDFReport(data);
      default:
        return data;
    }
  }

  private convertToCSV(data: any): string {
    // CSV 변환 로직
    const lines = [];
    lines.push('Metric,Value');
    lines.push(`Total Revenue,${data.revenue.current}`);
    lines.push(`Revenue Growth,${data.revenue.growth}%`);
    lines.push(`Total Orders,${data.orders.total}`);
    lines.push(`Average Order Value,${data.orders.averageValue}`);
    // ... 추가 메트릭
    return lines.join('\n');
  }

  private async generatePDFReport(data: any): Promise<Buffer> {
    // PDF 생성 로직 (puppeteer 또는 pdfkit 사용)
    // 구현 예정
    return Buffer.from('');
  }
}

// StockMovement import 추가
import { StockMovement } from '../entities/Inventory';
```

## 🔧 Phase 3: Controller 구현

### 3.1 InventoryController 생성
**파일 위치**: `apps/api-server/src/controllers/inventoryController.ts`

```typescript
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { InventoryService } from '../services/InventoryService';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '재고 목록 조회' })
  async getInventory(@Query() filters: any) {
    const data = await this.inventoryService.getInventory(filters);
    return { success: true, data };
  }

  @Post('adjust')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재고 조정' })
  async adjustStock(@Body() adjustment: any) {
    const data = await this.inventoryService.adjustStock(adjustment);
    return { success: true, data };
  }

  @Get('alerts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재고 알림 조회' })
  async getAlerts(@Query('severity') severity?: string) {
    const alerts = await this.inventoryService.getAlerts(severity);
    return { success: true, data: alerts };
  }

  @Post('alerts/:id/acknowledge')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '알림 확인 처리' })
  async acknowledgeAlert(@Param('id') id: string) {
    await this.inventoryService.acknowledgeAlert(id);
    return { success: true };
  }

  @Get(':id/movements')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '재고 이동 내역 조회' })
  async getMovements(@Param('id') id: string) {
    const movements = await this.inventoryService.getMovements(id);
    return { success: true, data: movements };
  }

  @Get(':id/forecast')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재고 예측' })
  async getForecast(@Param('id') id: string, @Query('days') days: number = 30) {
    const forecast = await this.inventoryService.forecastInventory(id, days);
    return { success: true, data: forecast };
  }

  @Get('reorder/settings')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재주문 설정 조회' })
  async getReorderSettings() {
    const settings = await this.inventoryService.getReorderSettings();
    return { success: true, data: settings };
  }

  @Put('reorder/settings')
  @Roles('admin')
  @ApiOperation({ summary: '재주문 설정 업데이트' })
  async updateReorderSettings(@Body() settings: any) {
    const data = await this.inventoryService.updateReorderSettings(settings);
    return { success: true, data };
  }

  @Get('reorder/rules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재주문 규칙 목록' })
  async getReorderRules() {
    const rules = await this.inventoryService.getReorderRules();
    return { success: true, data: rules };
  }

  @Put('reorder/rules/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재주문 규칙 업데이트' })
  async updateReorderRule(@Param('id') id: string, @Body() rule: any) {
    const data = await this.inventoryService.updateReorderRule(id, rule);
    return { success: true, data };
  }

  @Get('dead-stock')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '데드스톡 조회' })
  async getDeadStock(@Query('days') days: number = 90) {
    const deadStock = await this.inventoryService.identifyDeadStock(days);
    return { success: true, data: deadStock };
  }

  @Get('value')
  @Roles('admin')
  @ApiOperation({ summary: '총 재고 가치 조회' })
  async getInventoryValue() {
    const value = await this.inventoryService.calculateInventoryValue();
    return { success: true, data: { totalValue: value } };
  }
}
```

### 3.2 AnalyticsController 생성
**파일 위치**: `apps/api-server/src/controllers/analyticsController.ts`

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AnalyticsService } from '../services/AnalyticsService';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('e-commerce')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'E-commerce 대시보드 통계' })
  async getECommerceStats(@Query('period') period: string = 'month') {
    const stats = await this.analyticsService.getDashboardStats(period);
    return { success: true, data: stats };
  }

  @Get('revenue')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '매출 분석' })
  async getRevenueAnalytics(
    @Query('period') period: string = 'month',
    @Query('compare') compare: boolean = false
  ) {
    const revenue = await this.analyticsService.getRevenueAnalytics(period, compare);
    return { success: true, data: revenue };
  }

  @Get('products')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '상품 분석' })
  async getProductAnalytics(@Query('period') period: string = 'month') {
    const products = await this.analyticsService.getProductAnalytics(period);
    return { success: true, data: products };
  }

  @Get('customers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '고객 분석' })
  async getCustomerAnalytics(@Query('period') period: string = 'month') {
    const customers = await this.analyticsService.getCustomerAnalytics(period);
    return { success: true, data: customers };
  }

  @Get('inventory')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '재고 분석' })
  async getInventoryAnalytics() {
    const inventory = await this.analyticsService.getInventoryAnalytics();
    return { success: true, data: inventory };
  }

  @Get('report')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '보고서 생성' })
  async generateReport(
    @Query('type') type: string,
    @Query('period') period: string,
    @Query('format') format: 'json' | 'csv' | 'pdf' = 'json'
  ) {
    const report = await this.analyticsService.generateReport(type, period, format);
    return { success: true, data: report };
  }

  @Get('realtime')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '실시간 지표' })
  async getRealtimeMetrics() {
    const metrics = await this.analyticsService.getRealtimeMetrics();
    return { success: true, data: metrics };
  }

  @Get('trends')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '트렌드 분석' })
  async getTrends(@Query('metric') metric: string, @Query('period') period: string = 'month') {
    const trends = await this.analyticsService.getTrends(metric, period);
    return { success: true, data: trends };
  }
}
```

## 🔧 Phase 4: Toss Payments 고급 기능

### 4.1 TossPaymentsService 확장
**파일 위치**: `apps/api-server/src/services/TossPaymentsService.ts` (기존 파일에 추가)

```typescript
// 기존 코드에 추가할 메서드들

// 정기결제 등록
async createBillingKey(customerId: string, cardInfo: any) {
  const url = `${this.baseUrl}/billing/authorizations/card`;
  
  try {
    const response = await axios.post(url, {
      customerKey: customerId,
      cardNumber: cardInfo.number,
      cardExpirationYear: cardInfo.expirationYear,
      cardExpirationMonth: cardInfo.expirationMonth,
      cardPassword: cardInfo.password,
      customerIdentityNumber: cardInfo.identityNumber,
      customerName: cardInfo.customerName,
      customerEmail: cardInfo.customerEmail
    }, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    // 빌링키 저장
    await this.saveBillingKey(customerId, response.data.billingKey);
    
    return response.data;
  } catch (error) {
    logger.error('Failed to create billing key:', error);
    throw error;
  }
}

// 정기결제 실행
async executeSubscriptionPayment(subscriptionId: string) {
  const subscription = await this.getSubscription(subscriptionId);
  
  const url = `${this.baseUrl}/billing/${subscription.billingKey}`;
  
  try {
    const response = await axios.post(url, {
      customerKey: subscription.customerId,
      amount: subscription.amount,
      orderId: `SUB-${Date.now()}`,
      orderName: subscription.productName,
      customerEmail: subscription.customerEmail,
      customerName: subscription.customerName,
      taxFreeAmount: 0
    }, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    // 결제 기록 저장
    await this.recordSubscriptionPayment(subscription, response.data);
    
    return response.data;
  } catch (error) {
    logger.error('Failed to execute subscription payment:', error);
    
    // 실패 시 재시도 로직
    await this.scheduleRetry(subscriptionId);
    
    throw error;
  }
}

// 부분 취소
async partialCancel(paymentKey: string, cancelAmount: number, cancelReason: string) {
  const url = `${this.baseUrl}/payments/${paymentKey}/cancel`;
  
  try {
    const payment = await this.getPayment(paymentKey);
    
    if (payment.canceledAmount + cancelAmount > payment.totalAmount) {
      throw new BadRequestException('취소 금액이 결제 금액을 초과합니다');
    }

    const response = await axios.post(url, {
      cancelAmount,
      cancelReason,
      taxFreeAmount: 0,
      refundReceiveAccount: payment.virtualAccount // 가상계좌 환불 시
    }, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    // 부분 취소 기록
    await this.recordPartialCancel(paymentKey, cancelAmount, cancelReason);
    
    return response.data;
  } catch (error) {
    logger.error('Failed to partial cancel:', error);
    throw error;
  }
}

// 에스크로 구매 확정
async confirmEscrow(paymentKey: string) {
  const url = `${this.baseUrl}/payments/${paymentKey}/escrow/confirm`;
  
  try {
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to confirm escrow:', error);
    throw error;
  }
}

// 현금영수증 발급
async issueCashReceipt(amount: number, type: 'personal' | 'business', identifier: string) {
  const url = `${this.baseUrl}/cash-receipts`;
  
  try {
    const response = await axios.post(url, {
      amount,
      orderId: `CASH-${Date.now()}`,
      orderName: '현금영수증 발급',
      type: type === 'personal' ? '소득공제' : '지출증빙',
      registrationNumber: identifier,
      taxFreeAmount: 0
    }, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to issue cash receipt:', error);
    throw error;
  }
}

// 결제 정산 조회
async getSettlements(date: string) {
  const url = `${this.baseUrl}/settlements?date=${date}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to get settlements:', error);
    throw error;
  }
}

// 정기결제 스케줄러 (매일 실행)
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async processSubscriptions() {
  const today = new Date();
  const subscriptions = await this.getActiveSubscriptions(today);
  
  for (const subscription of subscriptions) {
    try {
      await this.executeSubscriptionPayment(subscription.id);
      logger.info(`Subscription payment successful: ${subscription.id}`);
    } catch (error) {
      logger.error(`Subscription payment failed: ${subscription.id}`, error);
      
      // 실패 알림 전송
      await this.sendPaymentFailureNotification(subscription);
    }
  }
}
```

## 🔧 Phase 5: 마이그레이션 생성

```bash
# 인벤토리 테이블 생성
cd apps/api-server
npm run migration:generate -- -n CreateInventoryTables

# 분석 관련 인덱스 추가
npm run migration:generate -- -n AddAnalyticsIndexes

# 마이그레이션 실행
npm run migration:run
```

## 🔧 Phase 6: 환경 변수 설정

**.env 파일에 추가**
```env
# Toss Payments
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
TOSS_WEBHOOK_SECRET=...

# Analytics Cache
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=300

# Inventory Settings
AUTO_REORDER_ENABLED=true
DEFAULT_LEAD_TIME=7
REORDER_CHECK_INTERVAL=3600000
LOW_STOCK_THRESHOLD=20
```

## 📊 테스트 시나리오

### 1. 재고 관리 테스트
```bash
# 재고 조정
curl -X POST http://localhost:3001/api/inventory/adjust \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "xxx",
    "type": "increase",
    "quantity": 100,
    "reason": "신규 입고"
  }'

# 재고 알림 조회
curl -X GET http://localhost:3001/api/inventory/alerts?severity=critical \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# 재고 예측
curl -X GET http://localhost:3001/api/inventory/{id}/forecast?days=30 \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 2. 분석 API 테스트
```bash
# 대시보드 통계
curl -X GET http://localhost:3001/api/analytics/ecommerce?period=month \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# 보고서 생성
curl -X GET http://localhost:3001/api/analytics/report?type=sales&period=month&format=pdf \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 3. Toss Payments 고급 기능 테스트
```bash
# 정기결제 등록
curl -X POST http://localhost:3001/api/payments/subscription \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER123",
    "productId": "PROD456",
    "amount": 9900,
    "interval": "monthly"
  }'

# 부분 취소
curl -X POST http://localhost:3001/api/payments/{paymentKey}/partial-cancel \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelAmount": 5000,
    "cancelReason": "부분 환불 요청"
  }'
```

## 🚀 배포 체크리스트

1. **데이터베이스 마이그레이션**
   - [ ] Inventory 테이블 생성
   - [ ] 분석 인덱스 추가
   - [ ] 기존 데이터 마이그레이션

2. **환경 변수 확인**
   - [ ] Toss Payments 키 설정
   - [ ] Redis 캐시 설정
   - [ ] 재고 관리 설정

3. **크론 작업 활성화**
   - [ ] 재고 상태 확인 (매시간)
   - [ ] 정기결제 처리 (매일 새벽 2시)
   - [ ] 보고서 생성 (매주/매월)

4. **모니터링 설정**
   - [ ] 재고 알림 이메일
   - [ ] 결제 실패 알림
   - [ ] 성능 메트릭

5. **성능 최적화**
   - [ ] 쿼리 최적화
   - [ ] 캐싱 전략
   - [ ] 인덱스 검증

## 📌 주의사항

1. **재고 관리**
   - 동시성 제어 필수 (트랜잭션)
   - 재고 예약/차감 시 데이터 정합성 보장
   - 재주문 중복 방지

2. **분석 데이터**
   - 대용량 데이터 처리 시 페이징
   - 캐시 적극 활용
   - 백그라운드 작업으로 처리

3. **Toss Payments**
   - 테스트/운영 키 분리
   - 웹훅 검증 필수
   - 실패 시 재시도 로직

---

이 작업 지시서를 API 서버의 Claude Code에게 전달하여 E-commerce 시스템의 백엔드 구현을 완료하세요.
예상 작업 시간: 8-10시간