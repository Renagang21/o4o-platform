/**
 * CmsContentSlot Entity
 *
 * WO-P2-IMPLEMENT-CONTENT: Content placement/scheduling entity
 *
 * Used to place content in specific locations with time-based visibility control.
 * Example slot keys: 'home-hero', 'intranet-hero', 'dashboard-banner', 'intranet-promo'
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CmsContent } from './CmsContent.entity.js';

@Entity('cms_content_slots')
@Index(['slotKey', 'serviceKey', 'isActive'])
@Index(['contentId'])
export class CmsContentSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Scope ===
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  serviceKey!: string | null;

  // === Slot Definition ===
  @Column({ type: 'varchar', length: 100 })
  slotKey!: string; // 'home-hero', 'dashboard-banner', 'intranet-promo'

  // === Content Reference ===
  @Column({ type: 'uuid' })
  contentId!: string;

  @ManyToOne(() => CmsContent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content?: CmsContent;

  // === Display Control ===
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startsAt!: Date | null; // Visibility start

  @Column({ type: 'timestamp', nullable: true })
  endsAt!: Date | null; // Visibility end

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
