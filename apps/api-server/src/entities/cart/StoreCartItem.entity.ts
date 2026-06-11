/**
 * StoreCartItem — Canonical Store Cart foundation
 * WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 매장 경영자가 주문 가능한 모든 상품 유형(운영자 승인 / B2B / 이벤트 오퍼 /
 * 판매자 모집)을 단일 cart item 표준으로 담는 서버 백엔드 장바구니.
 *
 * 설계 IR: IR-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-DESIGN-V1
 *
 * 경계: buyerId(구매 주체=매장 경영자) + serviceKey. organizationId(매장)는 주문 분할 시
 *       sellerOrganizationId 로 사용하기 위해 함께 보존.
 *
 * V1 범위: 저장/조회 foundation 만. 기존 cart 대체·participate 제거·수량차감 이전·
 *          주문/결제/정산 변경 없음. 이벤트 오퍼 가격/수량의 최종 검증은 checkout 확정
 *          단계(후속 Phase)에서 수행한다 — priceSnapshot 은 표시용 임시값.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CartSourceType =
  | 'regular'
  | 'operator_approved'
  | 'b2b'
  | 'event_offer'
  // 'seller_recruitment': 매장 취급 신청/공급 승인(ProductApproval) 도메인의 legacy/internal sourceType.
  // 실제 의미는 승인 전 신청 상태이며 주문 경로가 아니다(승인 전에는 주문 가능 상품으로 취급하지 않음).
  // Neture 제휴 'neture_partner_recruitments'(파트너 모집)와는 무관하다.
  // 경계 근거: IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1 / WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1.
  | 'seller_recruitment';

export type CartPricingSource = 'regular' | 'event_offer';

@Entity({ name: 'store_cart_items' })
@Index('IDX_store_cart_items_buyer_service', ['buyerId', 'serviceKey'])
export class StoreCartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 구매 주체(매장 경영자) — cart 소유자 */
  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId!: string;

  /** 매장(조직) — 주문 분할 시 sellerOrganizationId 로 사용 */
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  /** 매장이 속한 서비스 (kpa / glycopharm / k-cosmetics / neture …) */
  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  /** 상품 유형 — 탭/진입 출처(표시·정책용, 주문행동은 동일) */
  @Column({ name: 'source_type', type: 'varchar', length: 30, default: 'regular' })
  sourceType!: CartSourceType;

  /** 공급자 — 공급자별 그룹/배송비/무료배송 기준 (NetureSupplier.id) */
  @Column({ name: 'supplier_id', type: 'varchar', length: 100, nullable: true })
  supplierId?: string | null;

  /** SupplierProductOffer.id — 가격·재고·정산의 공통 앵커 */
  @Column({ name: 'supplier_product_offer_id', type: 'uuid', nullable: true })
  supplierProductOfferId?: string | null;

  /** OrganizationProductListing.id — 진열/이벤트 오퍼 listing */
  @Column({ name: 'organization_product_listing_id', type: 'uuid', nullable: true })
  organizationProductListingId?: string | null;

  /** 이벤트 오퍼 listing id (event_offer 일 때) */
  @Column({ name: 'event_offer_id', type: 'uuid', nullable: true })
  eventOfferId?: string | null;

  /** ProductMaster.id — 표시/검색용 */
  @Column({ name: 'product_master_id', type: 'uuid', nullable: true })
  productMasterId?: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 300 })
  productName!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  /** 가격 출처 — regular(일반 공급가) | event_offer(이벤트가) */
  @Column({ name: 'pricing_source', type: 'varchar', length: 20, default: 'regular' })
  pricingSource!: CartPricingSource;

  /** 담을 때의 표시 단가(원). 신뢰 가격은 checkout 확정 시 재검증. */
  @Column({ name: 'price_snapshot', type: 'int', default: 0 })
  priceSnapshot!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
