import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import type { User } from './User.js'

export interface PatternBlock {
  name: string
  attributes?: Record<string, any>
  innerBlocks?: PatternBlock[]
  innerHTML?: string
}

export interface PatternViewport {
  mobile?: number
  tablet?: number
  desktop?: number
}

export interface PatternMetadata {
  version?: string
  keywords?: string[]
  viewportWidth?: number | PatternViewport
  inserter?: boolean
  customCategories?: string[]
  blockTypes?: string[]
  postTypes?: string[]
  templateTypes?: string[]
}

@Entity('block_patterns')
export class BlockPattern {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  @Index()
  title!: string

  @Column({ type: 'varchar', unique: true, length: 255 })
  @Index()
  slug!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  // The actual pattern content (array of blocks)
  @Column({ type: 'json' })
  content!: PatternBlock[]

  // Pattern categories (header, footer, cta, hero, etc.)
  @Column({ 
    type: 'enum', 
    enum: ['header', 'footer', 'hero', 'cta', 'features', 'testimonials', 'pricing', 'contact', 'about', 'gallery', 'posts', 'general'],
    default: 'general'
  })
  @Index()
  category!: string

  // Sub-categories for more specific organization
  @Column({ type: 'simple-array', nullable: true })
  subcategories!: string[]

  // Tags for searchability
  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  // Pattern preview data
  @Column({ type: 'json', nullable: true })
  preview!: {
    html?: string
    css?: string
    screenshot?: string
    width?: number
    height?: number
  }

  // Pattern source (core, theme, plugin, user)
  @Column({ 
    type: 'enum',
    enum: ['core', 'theme', 'plugin', 'user'],
    default: 'user'
  })
  @Index()
  source!: string

  // Whether this pattern is featured/promoted
  @Column({ type: 'boolean', default: false })
  @Index()
  featured!: boolean

  // Usage tracking
  @Column({ type: 'integer', default: 0 })
  @Index()
  usageCount!: number

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date

  // Pattern visibility
  @Column({ 
    type: 'enum',
    enum: ['public', 'private', 'pro'],
    default: 'public'
  })
  @Index()
  visibility!: string

  // Pro/Premium patterns
  @Column({ type: 'boolean', default: false })
  isPremium!: boolean

  // Pattern metadata
  @Column({ type: 'json', nullable: true })
  metadata!: PatternMetadata

  // Author tracking
  @Column({ type: 'uuid' })
  @Index()
  authorId!: string

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author!: User

  // Version control
  @Column({ type: 'varchar', default: '1.0.0' })
  version!: string

  // Pattern dependencies (required blocks/plugins)
  @Column({ type: 'simple-array', nullable: true })
  dependencies!: string[]

  // Color scheme
  @Column({ type: 'simple-array', nullable: true })
  colorScheme!: string[]

  // Typography settings
  @Column({ type: 'json', nullable: true })
  typography!: {
    fontFamily?: string
    fontSize?: string
    lineHeight?: string
    fontWeight?: string
  }

  // Pattern status
  @Column({ 
    type: 'enum',
    enum: ['active', 'draft', 'archived'],
    default: 'active'
  })
  @Index()
  status!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Virtual method to increment usage
  incrementUsage(): void {
    this.usageCount += 1
    this.lastUsedAt = new Date()
  }

  // Virtual method to generate slug from title
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Check if pattern is compatible with current environment
  isCompatible(blockTypes: string[], plugins: string[]): boolean {
    if (!this.dependencies || this.dependencies.length === 0) {
      return true
    }

    // Check if all required blocks/plugins are available
    return this.dependencies.every(dep => 
      blockTypes.includes(dep) || plugins.includes(dep)
    )
  }

  // Generate preview HTML from pattern content
  generatePreviewHtml(): string {
    // Simplified preview generation
    // In real implementation, this would use WordPress block renderer
    const blocks = this.content.map(block => {
      const attrs = block.attributes ? JSON.stringify(block.attributes) : ''
      return `<div class="wp-block-${block.name}" data-attrs='${attrs}'>${block.innerHTML || ''}</div>`
    }).join('\n')

    return `
      <div class="block-pattern-preview">
        ${blocks}
      </div>
    `
  }
}