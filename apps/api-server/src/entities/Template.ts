import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'

export interface TemplateBlock {
  id: string
  type: string
  data: Record<string, unknown>
  order: number
}

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  name!: string

  @Column({ unique: true, length: 255 })
  slug!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @Column({ 
    type: 'enum', 
    enum: ['page', 'post', 'product', 'archive', 'single'],
    default: 'page'
  })
  type!: string

  @Column({ 
    type: 'enum', 
    enum: ['personal-blog', 'photo-blog', 'complex-blog', 'custom'],
    default: 'custom'
  })
  layoutType!: string

  @Column({ 
    type: 'enum', 
    enum: ['system', 'user'],
    default: 'user'
  })
  source!: string

  @Column({ type: 'json', nullable: true })
  content!: { blocks: TemplateBlock[] }

  @Column({ type: 'json', nullable: true })
  settings!: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  customFields!: Record<string, unknown>

  @Column({ type: 'text', nullable: true })
  preview!: string // Base64 screenshot or preview image URL

  @Column({ type: 'uuid', nullable: true })
  authorId!: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author!: User

  @Column({ default: true })
  active!: boolean

  @Column({ default: false })
  featured!: boolean

  @Column({ default: 0 })
  usageCount!: number

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ length: 50, nullable: true })
  version!: string

  @Column({ type: 'json', nullable: true })
  compatibility!: {
    minVersion?: string
    maxVersion?: string
    requiredPlugins?: string[]
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}