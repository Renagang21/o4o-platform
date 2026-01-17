import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';

/**
 * SignageLayoutPreset Entity
 *
 * Pre-configured layout presets for quick template creation.
 * - Standard layouts (single, split, grid, L-shaped, etc.)
 * - Responsive configurations
 * - System-provided or user-created
 */
@Entity('signage_layout_presets')
@Index(['serviceKey'])
@Index(['isSystem'])
@Index(['category'])
export class SignageLayoutPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Scope ==========
  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  serviceKey!: string | null; // null = platform-wide

  // ========== Basic Info ==========
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ========== Preset Data ==========
  @Column({ type: 'jsonb' })
  presetData!: {
    orientation: 'landscape' | 'portrait';
    aspectRatio: string; // e.g., '16:9', '9:16', '4:3'
    zones: Array<{
      name: string;
      zoneType: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
        unit: 'percent' | 'px';
      };
      zIndex: number;
    }>;
  };

  // ========== Categorization ==========
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null; // e.g., 'single', 'split', 'grid', 'custom'

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  // ========== Thumbnail ==========
  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  // ========== Flags ==========
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean; // Platform-provided preset

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // ========== Sort Order ==========
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  // ========== Versioning ==========
  @VersionColumn()
  version!: number;
}
