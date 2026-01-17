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
 * SignageContentBlock Entity
 *
 * Reusable content blocks for signage displays.
 * - Various block types (text, image, video, widget)
 * - Configurable settings per block type
 * - Template-independent reusable components
 */
@Entity('signage_content_blocks')
@Index(['serviceKey', 'organizationId'])
@Index(['blockType'])
@Index(['status'])
export class SignageContentBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Multi-tenant Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  // ========== Basic Info ==========
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ========== Block Type ==========
  @Column({
    type: 'varchar',
    length: 30,
  })
  blockType!: 'text' | 'image' | 'video' | 'html' | 'clock' | 'weather' | 'ticker' | 'qr' | 'custom';

  // ========== Content ==========
  @Column({ type: 'text', nullable: true })
  content!: string | null; // For text/html blocks

  @Column({ type: 'uuid', nullable: true })
  mediaId!: string | null; // For image/video blocks

  // ========== Settings ==========
  @Column({ type: 'jsonb', default: '{}' })
  settings!: {
    // Text settings
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    textColor?: string;
    // Common settings
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    // Animation
    animation?: string;
    animationDuration?: number;
    // Custom settings
    [key: string]: any;
  };

  // ========== Status ==========
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: 'active' | 'inactive' | 'draft';

  // ========== Categorization ==========
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  // ========== Ownership ==========
  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

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
