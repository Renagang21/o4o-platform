import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * AI Reference Entity
 *
 * Stores reference data for AI systems (blocks, shortcodes, image prompts, etc.)
 * This enables dynamic updates through AI Services UI without code changes.
 *
 * Examples:
 * - type: 'blocks', name: 'blocks-reference' -> Block definitions for AI page generation
 * - type: 'shortcodes', name: 'shortcode-registry' -> Shortcode definitions
 * - type: 'image-prompts', name: 'style-guide' -> Image generation style guide
 * - type: 'video-prompts', name: 'video-templates' -> Video generation templates
 */
@Entity('ai_references')
@Index(['type', 'name'], { unique: true }) // Prevent duplicate type+name combinations
export class AIReference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference type - extensible for future AI services
   * Examples: 'blocks', 'shortcodes', 'image-prompts', 'video-prompts', 'audio-prompts'
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  type!: string;

  /**
   * Reference name - unique within type
   * Examples: 'blocks-reference', 'shortcode-registry', 'style-guide'
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Reference content
   * Can be markdown or JSON depending on format field
   */
  @Column({ type: 'text' })
  content!: string;

  /**
   * Content format
   */
  @Column({
    type: 'enum',
    enum: ['markdown', 'json'],
    default: 'markdown'
  })
  format!: 'markdown' | 'json';

  /**
   * Version of the reference data
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  version?: string;

  /**
   * Schema version for validation
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  schemaVersion?: string;

  /**
   * Optional: Link to specific app
   * NULL = available to all apps
   * 'google-gemini-text' = only for this app
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  appSlug?: string | null;

  /**
   * Reference status
   */
  @Column({
    type: 'enum',
    enum: ['active', 'draft', 'archived'],
    default: 'active'
  })
  @Index()
  status!: 'active' | 'draft' | 'archived';

  /**
   * User who created this reference
   */
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string | null;

  /**
   * User who last updated this reference
   */
  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
