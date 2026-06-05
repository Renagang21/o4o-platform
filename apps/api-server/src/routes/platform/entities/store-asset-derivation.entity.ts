/**
 * StoreAssetDerivation Entity
 *
 * WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1 (IR Phase 2-B-2)
 *
 * 원본 콘텐츠/자료(source) ↔ 파생 결과물(derived: POP/QR/블로그/…) 관계 추적 전용 테이블.
 * 기존 결과물 저장소(store_execution_assets / store_qr_codes / store_blog_posts 등)는
 * 변경하지 않고, "어떤 원본에서 무엇이 만들어졌는가" 만 별도로 기록한다.
 *
 * 설계 원칙 (IR-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-SCHEMA-V1):
 *  - polymorphic relation → FK 미사용 (source/derived 가 여러 테이블·서로 다른 boundary·삭제정책).
 *    정합성은 application-level validation + cleanup 정책으로 관리.
 *  - organization_id + service_key 필수 (boundary).
 *  - source/derived kind 는 코드 상수(asset-derivation.constants)로 화이트리스트 검증.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_asset_derivations' })
@Index('IDX_store_asset_derivations_org', ['organizationId'])
@Index('IDX_store_asset_derivations_source', ['serviceKey', 'organizationId', 'sourceKind', 'sourceId'])
@Index('IDX_store_asset_derivations_derived', ['serviceKey', 'organizationId', 'derivedKind', 'derivedId'])
export class StoreAssetDerivation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 100 })
  serviceKey!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'source_kind', type: 'varchar', length: 50 })
  sourceKind!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'source_title', type: 'varchar', length: 255, nullable: true })
  sourceTitle?: string | null;

  @Column({ name: 'derived_kind', type: 'varchar', length: 50 })
  derivedKind!: string;

  @Column({ name: 'derived_id', type: 'uuid' })
  derivedId!: string;

  @Column({ name: 'derived_title', type: 'varchar', length: 255, nullable: true })
  derivedTitle?: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
