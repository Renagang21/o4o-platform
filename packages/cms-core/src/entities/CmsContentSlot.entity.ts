/**
 * CmsContentSlot Entity
 *
 * WO-P2-IMPLEMENT-CONTENT: Content placement/scheduling entity
 * WO-P7-CMS-SLOT-LOCK-P1: Added lock fields for edit restrictions
 *
 * Used to place content in specific locations with time-based visibility control.
 * Example slot keys: 'home-hero', 'intranet-hero', 'dashboard-banner', 'intranet-promo'
 *
 * Lock fields protect store autonomy by clearly marking which slots are:
 * - Freely editable by store (isLocked = false)
 * - Locked by contract agreement (isLocked = true)
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

  // === Lock Control (WO-P7-CMS-SLOT-LOCK-P1) ===
  // Protects store autonomy by marking contract-bound slots
  @Column({ type: 'boolean', default: false })
  isLocked!: boolean; // true = store cannot edit

  @Column({ type: 'varchar', length: 20, nullable: true })
  lockedBy!: 'platform' | 'contract' | null; // Who locked it

  @Column({ type: 'text', nullable: true })
  lockedReason!: string | null; // Display reason for UI

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil!: Date | null; // Contract end date (null = indefinite)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
