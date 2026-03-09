import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ProductOcrText — WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Image에서 Google Vision API로 추출한 OCR 텍스트.
 * AI Content 생성 시 추가 입력 데이터로 활용.
 */
@Entity({ name: 'product_ocr_texts' })
@Index('IDX_product_ocr_texts_product', ['productId'])
export class ProductOcrText {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'image_id', type: 'uuid', nullable: true })
  imageId!: string | null;

  @Column({ name: 'ocr_text', type: 'text', nullable: true })
  ocrText!: string | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  confidence!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
