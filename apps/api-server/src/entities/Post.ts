import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm'
import type { User } from './User.js'
import type { Category } from './Category.js'
import type { Tag } from './Tag.js'
import { AccessControl } from '@o4o/types'
// Import types from SSOT - using relative path due to module resolution
// TODO Phase 3: Update tsconfig paths to support @o4o/types/cpt export
import type { Block, SEOMetadata, PostRevision, PostMetaFields } from '@o4o/types/dist/cpt/index.js'

// Re-export for convenience
export type { Block, SEOMetadata, PostRevision }

// PostMeta interface (legacy compatibility)
export interface PostMeta extends PostMetaFields {
  [key: string]: unknown
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  title!: string

  @Column({ unique: true, length: 255 })
  slug!: string

  @Column({ type: 'text', nullable: true })
  content!: string

  @Column({ type: 'text', nullable: true })
  excerpt!: string

  @Column({ 
    type: 'enum', 
    enum: ['draft', 'publish', 'private', 'trash'],
    default: 'draft'
  })
  status!: 'draft' | 'publish' | 'private' | 'trash'

  // Post type field for supporting custom post types
  @Column({
    type: 'varchar',
    length: 50,
    default: 'post'
  })
  type!: string

  // Phase 6: Multi-tenant support
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Tenant identifier for multi-tenant isolation (NULL = global)'
  })
  tenant_id!: string | null

  @Column({ nullable: true })
  template!: string

  @Column({ nullable: true })
  featured_media!: string

  @Column({ 
    type: 'enum',
    enum: ['open', 'closed'],
    default: 'open'
  })
  comment_status!: 'open' | 'closed'

  @Column({ 
    type: 'enum',
    enum: ['open', 'closed'],
    default: 'open'
  })
  ping_status!: 'open' | 'closed'

  @Column({ default: false })
  sticky!: boolean

  // DEPRECATED: meta column removed from database schema (2025-11-06)
  // Database now uses normalized post_meta table for metadata storage
  // This TypeScript-only field maintains backward compatibility with legacy routes
  // TypeORM does not persist this field - always returns undefined/empty object
  // TODO Phase 3: Migrate all routes reading post.meta to use post_meta table
  meta?: Record<string, any> = {}

  // Categories and Tags (Many-to-Many relationships)
  @ManyToMany('Category', 'posts', { nullable: true, cascade: true })
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' }
  })
  categories!: Category[]

  @ManyToMany('Tag', 'posts', { nullable: true, cascade: true })
  @JoinTable({
    name: 'post_tag_relationships',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags!: Tag[]

  @Column({ type: 'json', nullable: true })
  seo!: SEOMetadata

  // Role-based access control
  @Column({
    type: 'jsonb',
    default: () => "'{\"enabled\": false, \"allowedRoles\": [\"everyone\"], \"requireLogin\": false}'"
  })
  accessControl!: AccessControl

  // Hide from search engines (useful for restricted content)
  @Column({ type: 'boolean', default: false })
  hideFromSearchEngines!: boolean

  @Column({ type: 'uuid' })
  author_id!: string

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author!: User

  @CreateDateColumn({ name: 'createdAt' })
  created_at!: Date

  @UpdateDateColumn({ name: 'updatedAt' })
  updated_at!: Date

  @Column({ type: 'timestamp', nullable: true })
  published_at!: Date
}