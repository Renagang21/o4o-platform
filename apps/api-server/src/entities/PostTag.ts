import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Post } from './Post';

@Entity('post_tags')
export class PostTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ unique: true, length: 100 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color?: string; // Hex color for tag display

  @Column({ default: 0 })
  usageCount!: number; // Number of posts using this tag

  @Column({ default: true })
  isActive!: boolean;

  // SEO metadata for tag pages
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  // Relations
  @ManyToMany(() => Post, post => post.tags)
  posts!: Post[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper method to generate slug from name
  generateSlug(): void {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Helper method to increment usage count
  incrementUsage(): void {
    this.usageCount = (this.usageCount || 0) + 1;
  }

  // Helper method to decrement usage count
  decrementUsage(): void {
    this.usageCount = Math.max(0, (this.usageCount || 0) - 1);
  }
}