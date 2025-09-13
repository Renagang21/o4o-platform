import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm'
import { User } from './User'
import { Category } from './Category'
import { Tag } from './Tag'

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

  @Column({ type: 'json', nullable: true })
  meta!: Record<string, any>

  // Categories and Tags (Many-to-Many relationships)
  @ManyToMany(() => Category, category => category.posts, { nullable: true, cascade: true })
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' }
  })
  categories!: Category[]

  @ManyToMany(() => Tag, tag => tag.posts, { nullable: true, cascade: true })
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags!: Tag[]

  @Column({ type: 'json', nullable: true })
  seo!: SEOMetadata

  @Column({ type: 'uuid' })
  author_id!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author!: User

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date

  @Column({ type: 'timestamp', nullable: true })
  published_at!: Date
}