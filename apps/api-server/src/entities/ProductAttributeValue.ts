import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { ProductAttribute } from './ProductAttribute';

/**
 * 상품 속성 값 엔티티 (예: Red, Large, Cotton 등)
 */
@Entity('product_attribute_values')
@Index(['attributeId', 'value'], { unique: true })
export class ProductAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  attributeId: string;

  @ManyToOne(() => ProductAttribute, attribute => attribute.values, { onDelete: 'CASCADE' })
  attribute: ProductAttribute;

  @Column({ length: 100 })
  value: string; // 'Red', 'Large', 'Cotton' 등

  @Column({ length: 100 })
  slug: string; // 'red', 'large', 'cotton'

  @Column({ nullable: true })
  label: string; // 표시용 라벨 (다국어 지원 시)

  @Column({ nullable: true })
  colorCode: string; // 색상 타입일 때 HEX 코드

  @Column({ nullable: true })
  imageUrl: string; // 이미지 타입일 때 URL

  @Column({ type: 'json', nullable: true })
  metadata: {
    sortOrder?: number;
    isDefault?: boolean;
    priceAdjustment?: number; // 가격 조정 (예: +5000원)
    stockAdjustment?: number; // 재고 조정
  };

  @Column({ default: 0 })
  position: number; // 표시 순서

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}