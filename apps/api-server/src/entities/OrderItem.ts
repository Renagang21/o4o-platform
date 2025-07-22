import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orderId!: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column()
  productId!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column()
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number; // 주문 시점의 단가

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number; // unitPrice * quantity

  // 주문 시점의 상품 정보 스냅샷
  @Column({ type: 'json' })
  productSnapshot!: {
    name: string;
    sku: string;
    image: string;
    description?: string;
    weight?: number;
    category?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Getter for price (alias for unitPrice)
  get price(): number {
    return this.unitPrice;
  }
}
