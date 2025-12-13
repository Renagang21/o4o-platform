/**
 * PharmacyInventory Entity
 *
 * 약국 재고 관리를 위한 엔티티
 * 자동발주(Auto-Reorder) 기능의 핵심 데이터 모델
 *
 * @package @o4o/pharmacyops
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 재고 상태
 */
export enum InventoryStatus {
  /** 정상 재고 */
  NORMAL = 'normal',
  /** 재고 부족 (안전재고 미만) */
  LOW = 'low',
  /** 재고 소진 */
  OUT_OF_STOCK = 'out_of_stock',
  /** 과잉 재고 */
  OVERSTOCK = 'overstock',
}

/**
 * 재고 업데이트 소스
 */
export enum InventoryUpdateSource {
  /** 수동 입력 */
  MANUAL = 'manual',
  /** 주문 완료 시 자동 증가 */
  ORDER_RECEIVED = 'order_received',
  /** 판매/조제 시 자동 감소 */
  DISPENSED = 'dispensed',
  /** 재고 조사 (실사) */
  AUDIT = 'audit',
  /** 시스템 자동 조정 */
  SYSTEM = 'system',
}

@Entity('pharmacy_inventory')
@Index(['pharmacyId', 'productId'], { unique: true })
@Index(['pharmacyId', 'status'])
export class PharmacyInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 약국 ID
   */
  @Column({ type: 'uuid', name: 'pharmacy_id' })
  @Index()
  pharmacyId!: string;

  /**
   * 제품 ID (PharmaceuticalProduct)
   */
  @Column({ type: 'uuid', name: 'product_id' })
  @Index()
  productId!: string;

  /**
   * 제품명 (캐싱용)
   */
  @Column({ type: 'varchar', length: 255, name: 'product_name' })
  productName!: string;

  /**
   * 제품 SKU (캐싱용)
   */
  @Column({ type: 'varchar', length: 100, name: 'product_sku', nullable: true })
  productSku?: string;

  /**
   * 현재 재고 수량
   */
  @Column({ type: 'int', name: 'current_stock', default: 0 })
  currentStock!: number;

  /**
   * 안전 재고 기준
   * 이 수량 이하로 떨어지면 재주문 권장
   */
  @Column({ type: 'int', name: 'safety_stock', default: 10 })
  safetyStock!: number;

  /**
   * 최소 주문 수량
   */
  @Column({ type: 'int', name: 'min_order_quantity', default: 1 })
  minOrderQuantity!: number;

  /**
   * 최대 재고 수량 (과잉재고 방지용)
   */
  @Column({ type: 'int', name: 'max_stock', nullable: true })
  maxStock?: number;

  /**
   * 일평균 소비량 (Average Daily Usage)
   * 자동발주 계산에 사용
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'average_daily_usage', default: 0 })
  averageDailyUsage!: number;

  /**
   * 재고 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: InventoryStatus.NORMAL,
  })
  status!: InventoryStatus;

  /**
   * 마지막 업데이트 소스
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'last_update_source',
    default: InventoryUpdateSource.MANUAL,
  })
  lastUpdateSource!: InventoryUpdateSource;

  /**
   * 마지막 입고일
   */
  @Column({ type: 'timestamp', name: 'last_received_at', nullable: true })
  lastReceivedAt?: Date;

  /**
   * 마지막 출고일 (조제/판매)
   */
  @Column({ type: 'timestamp', name: 'last_dispensed_at', nullable: true })
  lastDispensedAt?: Date;

  /**
   * 냉장 보관 필요 여부
   */
  @Column({ type: 'boolean', name: 'requires_cold_chain', default: false })
  requiresColdChain!: boolean;

  /**
   * 마약류 여부
   */
  @Column({ type: 'boolean', name: 'is_narcotic', default: false })
  isNarcotic!: boolean;

  /**
   * 유효기간 관리 필요 여부
   */
  @Column({ type: 'boolean', name: 'track_expiry', default: true })
  trackExpiry!: boolean;

  /**
   * 가장 가까운 유효기간
   */
  @Column({ type: 'date', name: 'nearest_expiry_date', nullable: true })
  nearestExpiryDate?: Date;

  /**
   * 메모
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ========================================
  // Computed Properties
  // ========================================

  /**
   * 재고 부족 여부
   */
  get isLowStock(): boolean {
    return this.currentStock < this.safetyStock;
  }

  /**
   * 재고 소진 여부
   */
  get isOutOfStock(): boolean {
    return this.currentStock === 0;
  }

  /**
   * 재주문 필요 여부
   */
  get needsReorder(): boolean {
    return this.currentStock <= this.safetyStock;
  }

  /**
   * 예상 소진일 (일 단위)
   */
  get estimatedDaysUntilStockout(): number | null {
    if (this.averageDailyUsage <= 0) return null;
    return Math.floor(this.currentStock / Number(this.averageDailyUsage));
  }
}
