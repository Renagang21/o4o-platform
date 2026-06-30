/**
 * RepresentativeProduct Entity
 *
 * O4O 표준상품 구조의 **대표상품(그룹핑) 계층**.
 * 여러 포장단위/SKU(ProductMaster)를 하나의 소비자 안내·콘텐츠 기준으로 묶는 상위 노드.
 *
 * WO-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1
 * 정책: docs/investigations/IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1.md
 *
 * 원칙:
 *   - 주문 단위 아님. 주문·공급·유통은 기존 ProductMaster / SupplierProductOffer /
 *     OrganizationProductListing 가 그대로 담당한다.
 *   - 콘텐츠·소비자안내·대표노출·그룹핑 기준점.
 *   - display_name 외 거의 전부 nullable. manufacturer_name 은 반드시 nullable
 *     (동일 품목기준코드에 여러 업체 혼입 존재 → 단일 자동파생 위험. 자동채움은 별도 import IR 위임).
 *   - 자동생성/backfill/공공데이터 import 는 이번 범위 아님.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';

@Entity('representative_products')
export class RepresentativeProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 대표 표시명 (유일 필수) */
  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  /**
   * 제조사명 — nullable (자동파생 금지).
   * 동일 품목기준코드에 여러 업체 혼입 7~8% 존재 → 멤버 파생 시 단일화 위험.
   */
  @Column({ name: 'manufacturer_name', type: 'varchar', length: 255, nullable: true })
  manufacturerName: string | null;

  /** 대표 썸네일 이미지 참조 — nullable (없으면 멤버 primary ProductImage fallback, 후속) */
  @Column({ name: 'thumbnail_image_id', type: 'uuid', nullable: true })
  thumbnailImageId: string | null;

  /** 확장 메타데이터 — nullable */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** 이 대표상품에 묶인 포장단위(ProductMaster) 목록 — additive, optional */
  @OneToMany('ProductMaster', 'representativeProduct')
  productMasters?: ProductMaster[];
}
