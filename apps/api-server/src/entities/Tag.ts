import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Post } from './Post';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ unique: true, length: 100 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;


  @Column({ default: 0 })
  count!: number; // Number of posts using this tag

  @Column({ type: 'json', nullable: true })
  meta!: Record<string, any>;

  // Relations
  @ManyToMany(() => Post, post => post.tags)
  posts!: Post[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

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
    this.count = (this.count || 0) + 1;
  }

  // Helper method to decrement usage count
  decrementUsage(): void {
    this.count = Math.max(0, (this.count || 0) - 1);
  }
}