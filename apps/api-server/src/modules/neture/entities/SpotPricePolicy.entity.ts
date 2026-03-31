import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1
 *
 * 스팟 가격 정책 — 상품별 기간 한정 특별 공급가.
 * 상시 가격(priceGeneral/priceGold)과 분리된 정책형 가격 구조.
 */
@Entity({ name: 'spot_price_policies' })
@Index('IDX_spot_price_policies_offer', ['offerId'])
@Index('IDX_spot_price_policies_supplier', ['supplierId'])
@Index('IDX_spot_price_policies_status', ['status'])
export class SpotPricePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 대상 상품 (supplier_product_offers.id) */
  @Column({ name: 'offer_id', type: 'uuid' })
  offerId!: string;

  /** 공급자 ID (소유권 확인용) */
  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  /** 정책 이름 (예: "봄맞이 스팟", "3월 프로모션") */
  @Column({ name: 'policy_name', type: 'varchar', length: 200 })
  policyName!: string;

  /** 스팟 가격 (원) */
  @Column({ name: 'spot_price', type: 'int' })
  spotPrice!: number;

  /** 정책 상태 */
  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: 'DRAFT' | 'ACTIVE' | 'CANCELLED';

  /** 시작일시 */
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  /** 종료일시 */
  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
