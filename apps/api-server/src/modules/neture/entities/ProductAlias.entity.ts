/**
 * ProductAlias Entity
 *
 * WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1
 *
 * ProductMaster의 검색 별칭(alias) 저장.
 * 사용자가 실제로 입력/검색한 표현을 누적하여 검색 품질을 향상시킨다.
 *
 * - 사용자에게 개념 노출 없음 (완전 내부 시스템)
 * - 동일 (product_master_id, normalized_alias) 중복 방지 (unique index)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AliasSource {
  /** 검색창에서 입력 후 선택 */
  SEARCH = 'search',
  /** bulk import SIMILAR 선택 */
  BULK = 'bulk',
  /** 수동 입력 */
  MANUAL = 'manual',
  /** CSV/XLSX 임포트 */
  IMPORT = 'import',
}

@Entity('product_aliases')
@Index(['normalizedAlias'])
@Index(['productMasterId'])
@Index('uq_product_alias', ['productMasterId', 'normalizedAlias'], { unique: true })
export class ProductAlias {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_master_id', type: 'uuid' })
  productMasterId: string;

  /** 원본 alias 텍스트 */
  @Column({ name: 'alias', type: 'varchar', length: 255 })
  alias: string;

  /** normalizeName() 적용 결과 — 검색/중복 방지 기준 */
  @Column({ name: 'normalized_alias', type: 'varchar', length: 255 })
  normalizedAlias: string;

  @Column({
    name: 'source',
    type: 'enum',
    enum: AliasSource,
    enumName: 'product_alias_source_enum',
    default: AliasSource.SEARCH,
  })
  source: AliasSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
