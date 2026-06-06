/**
 * ProductIdentifier Entity — Identifier Core (Phase 2)
 *
 * WO-O4O-PRODUCT-IDENTIFIER-CORE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §5 (Product Identifier Policy)
 *
 * ProductMaster 1 : N ProductIdentifier (additive 계층).
 *
 * 목적:
 *   - product_masters.barcode 단일 UNIQUE 컬럼의 제약을 깨지 않고(additive),
 *     다중 식별자 / 비-GTIN 식별자 / 의약품 코드 / 보험코드 / 공급자 코드 /
 *     내부 코드 / 약국·매장 로컬 코드 수용 기반을 마련한다.
 *   - primary barcode 는 ProductMaster.barcode 에 mirror 로 유지하고,
 *     identifiers 는 가산(additive)한다.
 *
 * 설계 원칙:
 *   - identifier_type / verification_status 는 DB enum 이 아니라 varchar +
 *     application-level union 으로 둔다. (Rx/OTC/외부 식별자 확장 시 enum migration 반복 회피)
 *   - 전역 UNIQUE(normalized_value) 는 두지 않는다. (중복 barcode/충돌 수용이 목적)
 *     중복 방지는 (product_master_id, identifier_type, normalized_value, deleted_at IS NULL)
 *     partial unique index 로만 적용한다. (migration)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';

/**
 * 식별자 유형 (application-level union)
 *
 * - GTIN/EAN13/UPC/JAN : 국제 상품 식별 바코드 체계
 * - INTERNAL_O4O       : 바코드 미입력 시 O4O 내부 생성 (gtin.ts:generateInternalBarcode)
 * - SUPPLIER_SKU       : 공급자 SKU
 * - PHARMACY_LOCAL     : 약국 로컬 코드
 * - STORE_LOCAL        : 매장 로컬 코드
 * - KOREA_DRUG_CODE    : 한국 약품 표준코드 (PharmaProductMaster.drugCode 대응)
 * - KOREA_INSURANCE_CODE : 보험코드 (PharmaProductMaster.insuranceCode 대응)
 * - ATC_CODE           : ATC 분류코드 (PharmaProductMaster.atcCode 대응)
 * - MFDS_CODE          : 식약처 코드
 * - UNKNOWN            : 미분류
 */
export type ProductIdentifierType =
  | 'GTIN'
  | 'EAN13'
  | 'UPC'
  | 'JAN'
  | 'INTERNAL_O4O'
  | 'SUPPLIER_SKU'
  | 'PHARMACY_LOCAL'
  | 'STORE_LOCAL'
  | 'KOREA_DRUG_CODE'
  | 'KOREA_INSURANCE_CODE'
  | 'ATC_CODE'
  | 'MFDS_CODE'
  | 'UNKNOWN';

export const PRODUCT_IDENTIFIER_TYPES: ProductIdentifierType[] = [
  'GTIN',
  'EAN13',
  'UPC',
  'JAN',
  'INTERNAL_O4O',
  'SUPPLIER_SKU',
  'PHARMACY_LOCAL',
  'STORE_LOCAL',
  'KOREA_DRUG_CODE',
  'KOREA_INSURANCE_CODE',
  'ATC_CODE',
  'MFDS_CODE',
  'UNKNOWN',
];

/**
 * 검증 상태 (application-level union)
 *
 * - unverified         : 미검증 (기본)
 * - system_generated   : 시스템 자동 생성 (내부 바코드 등)
 * - imported           : 외부 import 로 유입
 * - supplier_provided  : 공급자 제공
 * - pharmacy_provided  : 약국 제공
 * - operator_verified  : 운영자 검증 완료
 * - conflict           : 충돌 (동일 값이 복수 master 에 존재 등)
 * - deprecated         : 폐기됨
 */
export type ProductIdentifierVerificationStatus =
  | 'unverified'
  | 'system_generated'
  | 'imported'
  | 'supplier_provided'
  | 'pharmacy_provided'
  | 'operator_verified'
  | 'conflict'
  | 'deprecated';

export const PRODUCT_IDENTIFIER_VERIFICATION_STATUSES: ProductIdentifierVerificationStatus[] = [
  'unverified',
  'system_generated',
  'imported',
  'supplier_provided',
  'pharmacy_provided',
  'operator_verified',
  'conflict',
  'deprecated',
];

@Entity('product_identifiers')
@Index('idx_product_identifiers_product_master_id', ['productMasterId'])
@Index('idx_product_identifiers_identifier_type', ['identifierType'])
@Index('idx_product_identifiers_normalized_value', ['normalizedValue'])
@Index('idx_product_identifiers_type_normalized', ['identifierType', 'normalizedValue'])
@Index('idx_product_identifiers_primary', ['productMasterId', 'isPrimary'])
export class ProductIdentifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 소속 ProductMaster (Identifier Core 는 Master 1:N) */
  @Column({ name: 'product_master_id', type: 'uuid' })
  productMasterId: string;

  @ManyToOne('ProductMaster', 'identifiers', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_master_id' })
  productMaster?: ProductMaster;

  /** 식별자 유형 (application-level union, varchar) */
  @Column({ name: 'identifier_type', type: 'varchar', length: 40 })
  identifierType: ProductIdentifierType;

  /** 원본 식별자 값 (입력 그대로) */
  @Column({ name: 'identifier_value', type: 'varchar', length: 128 })
  identifierValue: string;

  /** 정규화된 식별자 값 (검색/중복판정 기준) */
  @Column({ name: 'normalized_value', type: 'varchar', length: 128 })
  normalizedValue: string;

  /** 출처 유형 (예: product_master_backfill, supplier_offer, mobile_draft, import) */
  @Column({ name: 'source_type', type: 'varchar', length: 64, nullable: true })
  sourceType: string | null;

  /** 출처 레코드 ID (offer/draft/import row 등) */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  /** 출처 표시 라벨 (디버깅/추적용) */
  @Column({ name: 'source_label', type: 'varchar', length: 128, nullable: true })
  sourceLabel: string | null;

  /** 국가 코드 (식별자 체계가 국가별로 다른 경우) */
  @Column({ type: 'varchar', length: 8, nullable: true })
  country: string | null;

  /** 이 master 의 primary 식별자 여부 (primary 는 ProductMaster.barcode mirror) */
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  /** 검증 상태 (application-level union, varchar) */
  @Column({ name: 'verification_status', type: 'varchar', length: 32, default: 'unverified' })
  verificationStatus: ProductIdentifierVerificationStatus;

  /** 부가 메타데이터 (originalBarcodeSource 등) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** soft delete (deleted_at IS NULL 만 활성으로 간주) */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
