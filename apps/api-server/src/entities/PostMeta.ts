/**
 * PostMeta Entity
 * Phase 4-1/6: Normalized post metadata storage
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('post_meta')
@Index(['post_id', 'meta_key'], { unique: true })
@Index(['tenant_id', 'post_id', 'meta_key'])
export class PostMeta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  post_id!: string;

  @Column({ type: 'varchar', length: 255 })
  meta_key!: string;

  @Column({ type: 'jsonb', nullable: true })
  meta_value!: any;

  // Phase 6: Multi-tenant support
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Tenant identifier for multi-tenant isolation (NULL = global)'
  })
  tenant_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
