# 📦 재고 관리 시스템

> **O4O Platform의 실시간 재고 관리 및 최적화 가이드**
> 
> **기준일**: 2025-06-25  
> **상태**: Phase 1 구현 완료

---

## 🎯 **재고 관리 개요**

### **핵심 특징**
- **실시간 재고 추적**: 주문 시 즉시 재고 차감
- **동시성 처리**: 여러 사용자의 동시 주문 안전 처리
- **자동 복구**: 주문 취소 시 재고 자동 복원
- **재고 부족 알림**: 임계치 도달 시 자동 알림

### **재고 상태 정의**
```typescript
export enum StockStatus {
  IN_STOCK = 'in_stock',        // 재고 있음
  LOW_STOCK = 'low_stock',      // 재고 부족 (임계치 이하)
  OUT_OF_STOCK = 'out_of_stock', // 재고 없음
  DISCONTINUED = 'discontinued'   // 단종
}
```

---

## 🗄️ **데이터 모델**

### **Product 엔티티 재고 필드**
```typescript
@Entity('products')
export class Product {
  @Column('int', { default: 0 })
  stock: number;

  @Column('int', { default: 5 })
  lowStockThreshold: number;

  @Column('int', { default: 0 })
  reservedStock: number; // 주문 대기 중인 재고

  @Column({
    type: 'enum',
    enum: StockStatus,
    default: StockStatus.IN_STOCK
  })
  stockStatus: StockStatus;

  @Column('timestamp', { nullable: true })
  lastRestockedAt: Date;
}
```

### **재고 이동 기록 (Stock Movement)**
```typescript
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product)
  product: Product;

  @Column('int')
  quantity: number; // 양수: 입고, 음수: 출고

  @Column({
    type: 'enum',
    enum: MovementType
  })
  type: MovementType;

  @Column({ nullable: true })
  orderId: number; // 주문과 연관된 경우

  @Column('text', { nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}

export enum MovementType {
  PURCHASE = 'purchase',    // 구매 입고
  SALE = 'sale',           // 판매 출고
  RETURN = 'return',       // 반품 입고
  ADJUSTMENT = 'adjustment', // 재고 조정
  DAMAGE = 'damage'        // 파손/폐기
}
```

---

## ⚙️ **재고 관리 로직**

### **재고 차감 프로세스**
```typescript
@Service()
export class InventoryService {
  async reserveStock(productId: number, quantity: number): Promise<boolean> {
    return await this.dataSource.transaction(async manager => {
      // 1. 상품 조회 (비관적 락)
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!product) {
        throw new Error('상품을 찾을 수 없습니다.');
      }

      // 2. 가용 재고 계산
      const availableStock = product.stock - product.reservedStock;
      
      if (availableStock < quantity) {
        return false; // 재고 부족
      }

      // 3. 예약 재고 증가
      product.reservedStock += quantity;
      await manager.save(product);

      // 4. 재고 이동 기록
      await this.recordStockMovement(manager, {
        productId: product.id,
        quantity: -quantity,
        type: MovementType.SALE,
        reason: '주문 예약'
      });

      return true;
    });
  }

  async confirmStock(productId: number, quantity: number): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' }
      });

      // 예약 재고를 실제 재고에서 차감
      product.stock -= quantity;
      product.reservedStock -= quantity;
      
      // 재고 상태 업데이트
      product.stockStatus = this.calculateStockStatus(product);
      
      await manager.save(product);
    });
  }

  async releaseReservedStock(productId: number, quantity: number): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' }
      });

      // 예약 재고만 해제 (실제 재고는 그대로)
      product.reservedStock -= quantity;
      await manager.save(product);

      // 취소 기록
      await this.recordStockMovement(manager, {
        productId: product.id,
        quantity: quantity,
        type: MovementType.ADJUSTMENT,
        reason: '주문 취소로 인한 예약 해제'
      });
    });
  }

  private calculateStockStatus(product: Product): StockStatus {
    const availableStock = product.stock - product.reservedStock;
    
    if (availableStock <= 0) {
      return StockStatus.OUT_OF_STOCK;
    } else if (availableStock <= product.lowStockThreshold) {
      return StockStatus.LOW_STOCK;
    } else {
      return StockStatus.IN_STOCK;
    }
  }
}
```

---

## 📊 **재고 모니터링**

### **실시간 재고 조회 API**
```typescript
// GET /api/inventory/products/:id/stock
@Controller('inventory')
export class InventoryController {
  @Get('products/:id/stock')
  async getStockInfo(@Param('id') productId: number) {
    const product = await this.inventoryService.getProductStock(productId);
    
    return {
      productId: product.id,
      totalStock: product.stock,
      reservedStock: product.reservedStock,
      availableStock: product.stock - product.reservedStock,
      status: product.stockStatus,
      lowStockThreshold: product.lowStockThreshold,
      lastRestockedAt: product.lastRestockedAt
    };
  }

  @Get('low-stock')
  async getLowStockProducts() {
    return await this.inventoryService.getLowStockProducts();
  }
}
```

### **재고 알림 시스템**
```typescript
@Service()
export class StockAlertService {
  async checkLowStockAlerts(): Promise<void> {
    const lowStockProducts = await this.inventoryService.getLowStockProducts();
    
    for (const product of lowStockProducts) {
      if (product.stockStatus === StockStatus.LOW_STOCK) {
        await this.sendLowStockAlert(product);
      } else if (product.stockStatus === StockStatus.OUT_OF_STOCK) {
        await this.sendOutOfStockAlert(product);
      }
    }
  }

  private async sendLowStockAlert(product: Product): Promise<void> {
    const alert = {
      type: 'LOW_STOCK',
      productId: product.id,
      productName: product.name,
      currentStock: product.stock - product.reservedStock,
      threshold: product.lowStockThreshold,
      message: `${product.name}의 재고가 부족합니다. (현재: ${product.stock - product.reservedStock}개)`
    };

    // 관리자에게 알림 전송
    await this.notificationService.sendToAdmins(alert);
  }
}
```

---

## 🔄 **재고 보충 프로세스**

### **자동 보충 시스템**
```typescript
@Service()
export class AutoRestockService {
  async checkAutoRestock(): Promise<void> {
    const products = await this.productRepository.find({
      where: { 
        autoRestockEnabled: true,
        stockStatus: In([StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK])
      }
    });

    for (const product of products) {
      await this.createRestockOrder(product);
    }
  }

  private async createRestockOrder(product: Product): Promise<void> {
    const restockQuantity = product.maxStockLevel - product.stock;
    
    const restockOrder = {
      productId: product.id,
      quantity: restockQuantity,
      supplier: product.preferredSupplier,
      expectedDelivery: this.calculateDeliveryDate(product.leadTimeDays),
      status: 'PENDING'
    };

    await this.restockOrderRepository.save(restockOrder);
    
    // 공급업체에 주문 전송
    await this.supplierService.sendRestockOrder(restockOrder);
  }
}
```

### **수동 재고 조정**
```typescript
// POST /api/inventory/products/:id/adjust
@Post('products/:id/adjust')
@Roles(UserRole.ADMIN, UserRole.MANAGER)
async adjustStock(
  @Param('id') productId: number,
  @Body() adjustmentData: StockAdjustmentDto
) {
  const { quantity, reason, type } = adjustmentData;
  
  await this.inventoryService.adjustStock(productId, quantity, reason, type);
  
  return {
    message: '재고가 성공적으로 조정되었습니다.',
    productId,
    adjustment: quantity,
    reason
  };
}
```

---

## 📈 **재고 분석 및 최적화**

### **재고 회전율 분석**
```typescript
@Service()
export class InventoryAnalyticsService {
  async calculateTurnoverRate(productId: number, days: number = 30): Promise<number> {
    const salesData = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('item.productId = :productId', { productId })
      .andWhere('order.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
      })
      .select('SUM(item.quantity)', 'totalSold')
      .getRawOne();

    const avgStock = await this.getAverageStock(productId, days);
    
    return salesData.totalSold / avgStock; // 회전율
  }

  async getSlowMovingProducts(threshold: number = 0.1): Promise<Product[]> {
    // 회전율이 임계치 이하인 상품들 조회
    const products = await this.productRepository.find();
    const slowMoving = [];

    for (const product of products) {
      const turnoverRate = await this.calculateTurnoverRate(product.id);
      if (turnoverRate < threshold) {
        slowMoving.push(product);
      }
    }

    return slowMoving;
  }
}
```

---

## 🎯 **재고 관리 베스트 프랙티스**

### **동시성 처리 전략**
1. **비관적 락**: 재고 변경 시 필수 사용
2. **트랜잭션**: 모든 재고 변경은 트랜잭션 내에서 처리
3. **재고 예약**: 주문 확정 전까지 예약 재고로 관리
4. **배치 처리**: 대량 재고 변경 시 배치 단위로 처리

### **성능 최적화**
```typescript
// 대량 상품의 재고 상태 업데이트
async updateStockStatusBatch(): Promise<void> {
  await this.dataSource.query(`
    UPDATE products 
    SET stock_status = 
      CASE 
        WHEN (stock - reserved_stock) <= 0 THEN 'out_of_stock'
        WHEN (stock - reserved_stock) <= low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END
    WHERE stock_status != 
      CASE 
        WHEN (stock - reserved_stock) <= 0 THEN 'out_of_stock'
        WHEN (stock - reserved_stock) <= low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END
  `);
}
```

### **모니터링 체크포인트**
- **재고 정확성**: 실제 재고와 시스템 재고 일치 여부
- **예약 재고**: 장기간 예약 상태인 재고 점검
- **회전율**: 정체 재고 식별 및 처리
- **손실율**: 파손/분실 재고 추적

---

## 🔗 **관련 문서**

- [주문 처리 워크플로우](order-processing.md)
- [가격 시스템](pricing-system.md)
- [API 명세서](../03-api-reference/ecommerce-api-specification.md)

---

<div align="center">

**📦 효율적인 재고 관리로 최적의 운영! 📦**

[💼 비즈니스 로직](pricing-system.md) • [🛒 주문 처리](order-processing.md) • [📊 현재 상황](../CURRENT-STATUS.md)

</div>
