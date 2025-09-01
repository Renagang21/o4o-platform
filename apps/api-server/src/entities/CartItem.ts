import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cart } from './Cart';
import { Product } from './Product';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  cartId!: string;

  @ManyToOne(() => Cart, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'cartId' })
  cart!: Promise<Cart>;

  @Column()
  productId!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number; // 추가 시점의 가격 (역할별 가격)

  @Column({ type: 'json', nullable: true })
  productSnapshot?: {
    name: string;
    image: string;
    sku: string;
    attributes?: Record<string, string | number | boolean>;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  getTotalPrice(): number {
    return this.price * this.quantity;
  }
}
