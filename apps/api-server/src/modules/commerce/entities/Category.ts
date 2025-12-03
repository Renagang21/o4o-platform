import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, ManyToMany, JoinColumn, Tree, TreeParent, TreeChildren } from 'typeorm';
import type { Post } from './Post.js';

@Entity('categories')
@Tree('nested-set')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  image?: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // SEO
  @Column({ type: 'varchar', nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  // 트리 구조를 위한 관계
  @TreeParent()
  parent?: Category;

  @TreeChildren()
  children!: Category[];

  @Column({ type: 'integer', default: 0 })
  count!: number;

  // Relations
  @ManyToMany('Post', 'categories')
  posts!: Post[];

  @CreateDateColumn({ name: 'createdAt' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updated_at!: Date;
}
