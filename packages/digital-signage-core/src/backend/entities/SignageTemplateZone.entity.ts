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
import type { SignageTemplate } from './SignageTemplate.entity.js';

/**
 * SignageTemplateZone Entity
 *
 * Defines individual zones within a template layout.
 * - Position and size configuration
 * - Zone type (media, text, clock, weather, etc.)
 * - Default content binding
 */
@Entity('signage_template_zones')
@Index(['templateId'])
@Index(['zoneType'])
export class SignageTemplateZone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Parent Template ==========
  @Column({ type: 'uuid' })
  @Index()
  templateId!: string;

  // ========== Basic Info ==========
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  zoneKey!: string | null; // Identifier for programmatic access

  // ========== Zone Type ==========
  @Column({
    type: 'varchar',
    length: 30,
  })
  zoneType!: 'media' | 'text' | 'clock' | 'weather' | 'ticker' | 'custom';

  // ========== Position & Size ==========
  @Column({ type: 'jsonb' })
  position!: {
    x: number; // percentage or pixels
    y: number;
    width: number;
    height: number;
    unit: 'percent' | 'px';
  };

  // ========== Z-Index & Order ==========
  @Column({ type: 'int', default: 0 })
  zIndex!: number;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // ========== Style Configuration ==========
  @Column({ type: 'jsonb', default: '{}' })
  style!: {
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    overflow?: 'hidden' | 'visible' | 'scroll';
  };

  // ========== Default Content Binding ==========
  @Column({ type: 'uuid', nullable: true })
  defaultPlaylistId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  defaultMediaId!: string | null;

  // ========== Zone Settings ==========
  @Column({ type: 'jsonb', default: '{}' })
  settings!: Record<string, any>; // Zone-type specific settings

  // ========== Control ==========
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ========== Relations (string-based for ESM) ==========
  @ManyToOne('SignageTemplate', 'zones', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template!: SignageTemplate;
}
