import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { CartItem } from './CartItem';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => CartItem, cartItem => cartItem.cart, { cascade: true })
  items!: CartItem[];

  @Column({ type: 'json', nullable: true })
  metadata?: {
    sessionId?: string;
    guestEmail?: string;
    notes?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  getTotalItems(): number {
    return this.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }

  getTotalPrice(): number {
    return this.items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;
  }

  isEmpty(): boolean {
    return !this.items || this.items.length === 0;
  }
}
