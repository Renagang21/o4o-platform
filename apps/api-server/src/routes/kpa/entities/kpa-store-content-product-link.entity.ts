/**
 * KpaStoreContentProductLink Entity — 매장 자료함 콘텐츠 ↔ 매장 취급제품 연결
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
 * 선행 IR: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-MODEL-V1
 *
 * 연결 기준 (확정):
 *   - O4O 기반 제품      → product_source_type='listing', product_source_id=organization_product_listings.id
 *   - 매장 경영활용 제품  → product_source_type='local',   product_source_id=store_local_products.id
 *
 * product_source_id 는 listing/local 다형 참조이므로 단일 FK 를 걸지 않는다(약참조).
 * content_id 는 kpa_store_contents FK CASCADE — 콘텐츠 삭제 시 link 자동 정리(DB 레벨, entity 관계는 두지 않음 / ESM 규칙).
 * master_id 는 O4O 기반 제품일 때 listing 의 master_id 를 부가 보존(매장 경영활용 제품이면 null).
 * link_type 은 V1 'product_description' 고정 — 기본 상세설명서 지정 컬럼은 두지 않는다(정책).
 *
 * Table: kpa_store_content_product_links
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StoreContentProductSourceType = 'listing' | 'local';
export type StoreContentLinkType = 'product_description';

@Entity('kpa_store_content_product_links')
@Index('IDX_kspcl_org_content', ['organization_id', 'content_id'])
@Index('IDX_kspcl_org_product', ['organization_id', 'product_source_type', 'product_source_id'])
export class KpaStoreContentProductLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 매장/조직 소유 검증 스코프 */
  @Column({ type: 'uuid' })
  organization_id: string;

  /** kpa_store_contents.id (FK CASCADE) */
  @Column({ type: 'uuid' })
  content_id: string;

  /** 'listing' = O4O 기반 제품 / 'local' = 매장 경영활용 제품 */
  @Column({ type: 'varchar', length: 20 })
  product_source_type: StoreContentProductSourceType;

  /** listing → organization_product_listings.id / local → store_local_products.id */
  @Column({ type: 'uuid' })
  product_source_id: string;

  /** O4O 기반 제품(listing)일 때 master_id 부가 보존, 매장 경영활용 제품이면 null */
  @Column({ type: 'uuid', nullable: true })
  master_id: string | null;

  /** V1 'product_description' 고정 */
  @Column({ type: 'varchar', length: 30, default: 'product_description' })
  link_type: StoreContentLinkType;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
