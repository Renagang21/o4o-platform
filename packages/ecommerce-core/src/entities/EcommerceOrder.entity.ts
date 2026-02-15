/**
 * EcommerceOrder Entity
 *
 * 판매 원장 (Source of Truth)
 *
 * 모든 판매 유형(retail, dropshipping, b2b, subscription)의
 * 주문을 통합 관리하는 원장 엔티티입니다.
 *
 * Dropshipping Core의 OrderRelay, Retail Core의 RetailOrder 등은
 * 이 Entity를 참조하는 파생 구조입니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';



/**
 * 주문 유형 (OrderType)
 *
 * E-commerce Core에서 모든 판매를 분류하는 핵심 열거형입니다.
 * Service Extension이 주문 생성 시 이 값을 결정합니다.
 *
 * ## OrderType 결정 원칙
 *
 * 1. **Service App/Extension이 결정**: OrderType은 주문을 생성하는
 *    Service App 또는 Extension이 비즈니스 로직에 따라 결정합니다.
 *
 * 2. **변경 불가**: 한번 설정된 OrderType은 주문 생명주기 동안 변경되지 않습니다.
 *
 * 3. **분기 기준**: Core App(Dropshipping Core, Retail Core 등)은
 *    OrderType을 확인하여 자신이 처리해야 할 주문인지 판단합니다.
 *
 * ## 각 타입별 처리 주체
 *
 * | OrderType     | 처리 주체              | 주요 특징                         |
 * |---------------|----------------------|----------------------------------|
 * | retail        | Retail Core (향후)    | 직접 재고, 단일 판매자              |
 * | dropshipping  | Dropshipping Core    | Offer→Listing→Relay 구조, 다중 공급 |
 * | b2b           | B2B Core (향후)       | 대량 주문, 견적, 신용 거래           |
 * | subscription  | Subscription Core (향후) | 정기 결제, 반복 주문              |
 */
export enum OrderType {
  /** 일반 소매 - 직접 재고 보유 판매 */
  RETAIL = 'retail',
  /** 드랍쉬핑 - 공급자→판매자→구매자 Relay 구조 */
  DROPSHIPPING = 'dropshipping',
  /** B2B 거래 - 사업자 간 대량 거래 */
  B2B = 'b2b',
  /** 정기 구독 - 반복 주문, 자동 갱신 */
  SUBSCRIPTION = 'subscription',
  /**
   * @deprecated WO-ORDER-TYPE-NORMALIZATION-V1
   * 신규 주문은 OrderType.RETAIL + metadata.serviceKey='glycopharm' 사용.
   * 기존 주문 호환을 위해 enum 값 유지. 삭제 금지.
   */
  GLYCOPHARM = 'glycopharm',
  /** LMS 유료 강의 (WO-LMS-PAID-COURSE-V1) */
  LMS = 'lms',
}

/**
 * 주문 상태
 */
export enum OrderStatus {
  CREATED = 'created',           // 주문 생성
  PENDING_PAYMENT = 'pending_payment', // 결제 대기
  PAID = 'paid',                 // 결제 완료
  CONFIRMED = 'confirmed',       // 주문 확정
  PROCESSING = 'processing',     // 처리 중
  SHIPPED = 'shipped',           // 배송 시작
  DELIVERED = 'delivered',       // 배송 완료
  COMPLETED = 'completed',       // 주문 완료
  CANCELLED = 'cancelled',       // 주문 취소
  REFUNDED = 'refunded',         // 환불 완료
}

/**
 * 결제 상태
 */
export enum PaymentStatus {
  PENDING = 'pending',           // 결제 대기
  PAID = 'paid',                 // 결제 완료
  FAILED = 'failed',             // 결제 실패
  REFUNDED = 'refunded',         // 환불 완료
  PARTIAL_REFUND = 'partial_refund', // 부분 환불
}

/**
 * 구매자 유형
 */
export enum BuyerType {
  USER = 'user',
  ORGANIZATION = 'organization',
}

/**
 * 판매자 유형
 */
export enum SellerType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
}

/**
 * 배송 주소
 */
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

@Entity('ecommerce_orders')
export class EcommerceOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 내부 주문 번호
   * 형식: ORD-YYYYMMDD-XXXX
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;

  /**
   * 외부 채널 주문 ID (스마트스토어, 쿠팡 등)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalOrderId?: string;

  // ===== 당사자 정보 =====

  /**
   * 구매자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  buyerId!: string;

  /**
   * 구매자 유형
   */
  @Column({
    type: 'enum',
    enum: BuyerType,
    default: BuyerType.USER,
  })
  buyerType!: BuyerType;

  /**
   * 판매자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  sellerId!: string;

  /**
   * 판매자 유형
   */
  @Column({
    type: 'enum',
    enum: SellerType,
    default: SellerType.ORGANIZATION,
  })
  sellerType!: SellerType;

  // ===== 금액 정보 =====

  /**
   * 상품 금액 합계
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  /**
   * 배송비
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee!: number;

  /**
   * 할인 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  /**
   * 최종 결제 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  /**
   * 통화
   */
  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // ===== 결제 정보 =====

  /**
   * 결제 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  /**
   * 결제 수단
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // ===== 주문 유형 및 상태 =====

  /**
   * 주문 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.RETAIL,
  })
  orderType!: OrderType;

  /**
   * 주문 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status!: OrderStatus;

  // ===== 매장 귀속 (Store Attribution) =====

  /**
   * 매장 ID (WO-KCOS-STORES-PHASE2)
   * 주문이 발생한 매장. KPI 집계의 기준 키.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  /**
   * 주문 소스
   * online, in-store, kiosk 등
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  orderSource?: string;

  /**
   * 비즈니스 채널
   * local, travel 등 (서비스별 채널 구분)
   */
  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  channel?: string;

  // ===== 배송 정보 =====

  /**
   * 배송 주소
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingAddress?: ShippingAddress;

  // ===== 메타데이터 =====

  /**
   * 확장 메타데이터
   * - 채널별 특화 데이터
   * - 프로모션 정보
   * - 기타 부가 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ===== 타임스탬프 =====

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ===== Relations =====

  @OneToMany('EcommerceOrderItem', 'order')
  items?: unknown[];

  @OneToMany('EcommercePayment', 'order')
  payments?: unknown[];
}
