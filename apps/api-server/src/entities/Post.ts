import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm'
import { User } from './User'
import { Category } from './Category'

export interface Block {
  id: string
  type: string
  data: unknown
  order: number
}

export interface SEOMetadata {
  title?: string
  description?: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  canonicalUrl?: string
  noindex?: boolean
  nofollow?: boolean
  schema?: Record<string, unknown>
}

export interface PostRevision {
  id: string
  timestamp: string
  author: string
  changes: Partial<Post>
}

// Post-specific interfaces
export interface PostFormat {
  type: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat'
}

export interface PostMeta {
  featuredImage?: string
  excerpt?: string
  readingTime?: number
  featured?: boolean
  sticky?: boolean
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

  @Column({ type: 'json', nullable: true })
  content!: { blocks: Block[] }

  @Column({ type: 'text', nullable: true })
  excerpt!: string

  @Column({ 
    type: 'enum', 
    enum: ['draft', 'published', 'private', 'archived', 'scheduled'],
    default: 'draft'
  })
  status!: string

  // Post type field for supporting custom post types
  @Column({ 
    type: 'varchar',
    length: 50,
    default: 'post'
  })
  type!: string

  // Post format (WordPress-style)
  @Column({ 
    type: 'enum',
    enum: ['standard', 'aside', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio', 'chat'],
    default: 'standard'
  })
  format!: string

  @Column({ nullable: true })
  template!: string

  // Categories and Tags (Many-to-Many relationships)
  @ManyToMany(() => Category, category => category.posts, { nullable: true })
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' }
  })
  categories!: Category[]

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ type: 'json', nullable: true })
  seo!: SEOMetadata

  @Column({ type: 'json', nullable: true })
  customFields!: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  postMeta!: PostMeta

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt!: Date

  @Column({ type: 'uuid' })
  authorId!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author!: User

  @Column({ type: 'uuid', nullable: true })
  lastModifiedBy!: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lastModifiedBy' })
  lastModifier!: User

  @Column({ default: 0 })
  views!: number

  @Column({ type: 'text', nullable: true })
  password!: string

  @Column({ default: false })
  passwordProtected!: boolean

  @Column({ default: true })
  allowComments!: boolean

  @Column({ default: 'open' })
  commentStatus!: string

  // Post-specific fields
  @Column({ default: false })
  featured!: boolean

  @Column({ default: false })
  sticky!: boolean

  @Column({ nullable: true })
  featuredImage!: string

  @Column({ type: 'integer', nullable: true })
  readingTime!: number

  @Column({ type: 'json', nullable: true })
  layoutSettings!: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  revisions!: PostRevision[]

  // Zone-based layout fields
  @Column({ type: 'json', nullable: true })
  zones?: any

  @Column({ type: 'json', nullable: true })
  themeCustomizations?: any

  @Column({ nullable: true })
  useZones?: boolean

  @Column({ nullable: true })
  layoutType?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}