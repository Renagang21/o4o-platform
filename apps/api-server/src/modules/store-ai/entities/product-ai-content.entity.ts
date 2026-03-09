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
