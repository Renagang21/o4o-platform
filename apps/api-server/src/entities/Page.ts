import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { User } from './User'

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

export interface PageRevision {
  id: string
  timestamp: string
  author: string
  changes: Partial<Page>
}

@Entity('pages')
export class Page {
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
    enum: ['draft', 'publish', 'private', 'archived', 'scheduled'],
    default: 'draft'
  })
  status!: string

  @Column({ default: 'page' })
  type!: string

  @Column({ nullable: true })
  template!: string

  @Column({ type: 'uuid', nullable: true })
  parentId!: string

  @ManyToOne(() => Page, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent!: Page

  @OneToMany(() => Page, page => page.parent)
  children!: Page[]

  @Column({ default: 0 })
  menuOrder!: number

  @Column({ default: true })
  showInMenu!: boolean

  @Column({ default: false })
  isHomepage!: boolean

  @Column({ type: 'json', nullable: true })
  seo!: SEOMetadata

  @Column({ type: 'json', nullable: true })
  customFields!: Record<string, unknown>

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt!: Date

  @Column({ type: 'uuid' })
  authorId!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
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

  @Column({ type: 'json', nullable: true })
  layoutSettings!: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  revisions!: PageRevision[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}