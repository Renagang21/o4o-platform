import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ProductAiContent — IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1
 *
 * Product Master 기반 AI 생성 콘텐츠.
 * content_type별 텍스트 저장 (POP 문구, QR 설명, 상품 설명 등).
 *
 * Taxonomy (WO-O4O-CONTENT-TYPE-TAXONOMY-AND-NAMING-ALIGNMENT-V1):
 *   contentType='product_description' 은 **canonical 상품설명이 아니다**. AI 생성 draft/source 이며,
 *   shared_product_descriptions 의 candidate seed source(seedFromProductAiContents) 로만 사용된다.
 *   소비자-facing 상품 상세는 product_ai_contents 를 직접 읽지 않는다
 *   (public 해석 순서: shared_product_descriptions(canonical) → store_product_profiles(legacy fallback)
 *    → supplier_product_offers; store-public-utils.ts COALESCE 참조).
 *   상세 정의: docs/architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md
 *
 * 소유권 (DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1, 판정 A):
 *   productId = product_masters.id **전용**. store_local_products.id 를 넣지 않는다.
 *   organization_id / store_id / service_key 를 갖지 않는 **전역(플랫폼 소유) 자원**이며,
 *   (product_id, content_type) 당 전역 단일 행이 최신 1개 upsert 계약이다.
 *   → 매장별 설명 저장소가 아니다. 매장 사용자의 쓰기는 금지한다.
 *   → 매장 자체 상품 설명은 store_local_products 자체 필드(detail_html 등),
 *      표준 상품 canonical 설명은 shared_product_descriptions 가 담당한다.
 */

export type ProductAiContentType =
  | 'product_description'
  | 'pop_short'
  | 'pop_long'
  | 'qr_description'
  | 'signage_text';

@Entity({ name: 'product_ai_contents' })
@Index('IDX_product_ai_contents_product', ['productId'])
@Index('IDX_product_ai_contents_type', ['productId', 'contentType'])
export class ProductAiContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType!: ProductAiContentType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
