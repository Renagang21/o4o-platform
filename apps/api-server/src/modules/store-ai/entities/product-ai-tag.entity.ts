import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ProductAiTag — WO-O4O-PRODUCT-AI-TAGGING-V1
 *
 * 상품별 AI 생성 또는 수동 입력 태그.
 * product_masters.tags (GIN 인덱스)와 동기화하여 검색 활용.
 *
 * 소유권 (DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1):
 *   productId = product_masters.id **전용**. store_local_products.id 를 넣지 않는다.
 *   organization_id / service_key 를 갖지 않는 **전역(플랫폼 소유) 자원**이며,
 *   공급자(자기 offer 에 연결된 master)·운영자·내부 자동화가 관리한다.
 *   → 매장별 태그 저장소가 아니다. 매장 사용자의 쓰기는 금지한다.
 *   syncMasterTags() 가 product_masters.tags 를 갱신하므로, 잘못된 productId 쓰기는
 *   전역 마스터 태그를 오염시킨다.
 */
@Entity({ name: 'product_ai_tags' })
@Index('IDX_product_ai_tags_product', ['productId'])
export class ProductAiTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'varchar', length: 100 })
  @Index('IDX_product_ai_tags_tag')
  tag!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  confidence!: number;

  @Column({ type: 'varchar', length: 20, default: 'ai' })
  source!: string; // 'ai' | 'manual'

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
