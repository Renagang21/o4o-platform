import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from './User.js';

/**
 * View Entity for NextGen CMS
 * Stores JSON-based page definitions for the ViewRenderer system
 */
@Entity('views')
export class View {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  viewId!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'jsonb' })
  json!: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  })
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  category!: string;

  @Column({ type: 'json', nullable: true })
  tags!: string[];

  @Column({ type: 'uuid', nullable: true })
  authorId!: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'uuid', nullable: true })
  lastModifiedBy!: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'lastModifiedBy' })
  lastModifier!: User;

  @Column({ type: 'integer', default: 0 })
  version!: number;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
