import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Product } from './Product';
import { ProductAttributeValue } from './ProductAttributeValue';

/**
 * 상품 속성 엔티티 (예: 색상, 사이즈, 재질 등)
 */
@Entity('product_attributes')
@Index(['productId', 'name'], { unique: true })
export class ProductAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  productId: string;

  @ManyToOne(() => Product, product => product.attributes, { onDelete: 'CASCADE' })
  product: Product;

  @Column({ length: 100 })
  name: string; // 'Color', 'Size', 'Material' 등

  @Column({ length: 100 })
  slug: string; // 'color', 'size', 'material'

  @Column({ type: 'enum', enum: ['select', 'color', 'button', 'image'], default: 'select' })
  type: 'select' | 'color' | 'button' | 'image';

  @Column({ default: 0 })
  position: number; // 표시 순서

  @Column({ default: true })
  visible: boolean; // 프론트엔드 표시 여부

  @Column({ default: false })
  variation: boolean; // 변형 생성에 사용되는지 여부

  @OneToMany(() => ProductAttributeValue, value => value.attribute, { cascade: true })
  values: ProductAttributeValue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}