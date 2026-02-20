/**
 * Display Media Entity
 * 스마트 디스플레이 미디어 소스 (YouTube/Vimeo)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';

export type MediaSourceType = 'youtube' | 'vimeo';

@Entity('glycopharm_display_media')
export class DisplayMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string;

  @ManyToOne('OrganizationStore', { nullable: true })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: OrganizationStore;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['youtube', 'vimeo'],
  })
  source_type!: MediaSourceType;

  @Column({ type: 'varchar', length: 500 })
  source_url!: string;

  @Column({ type: 'varchar', length: 100 })
  embed_id!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // 초 단위

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
