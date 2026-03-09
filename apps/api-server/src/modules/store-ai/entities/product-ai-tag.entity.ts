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
