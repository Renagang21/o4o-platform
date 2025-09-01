import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Note: OneToMany relationship removed to prevent circular dependency
  // Use CartItemRepository.find({ where: { cartId: cart.id } }) to get items

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

  // Note: Business logic methods removed due to items relationship removal
  // These methods should be implemented in a service class that can query CartItems
}
