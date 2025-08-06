import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn,
  Index
} from 'typeorm'
import { User } from './User'

export interface TemplatePartBlock {
  id: string
  type: string
  data: Record<string, unknown>
  attributes?: Record<string, unknown>
  innerBlocks?: TemplatePartBlock[]
}

export type TemplatePartArea = 'header' | 'footer' | 'sidebar' | 'general'

@Entity('template_parts')
@Index(['area', 'isActive'])
@Index(['slug'])
export class TemplatePart {
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
    enum: ['header', 'footer', 'sidebar', 'general'],
    default: 'general'
  })
  area!: TemplatePartArea

  @Column({ type: 'json' })
  content!: TemplatePartBlock[]

  @Column({ type: 'json', nullable: true })
  settings!: {
    containerWidth?: 'full' | 'wide' | 'narrow'
    backgroundColor?: string
    textColor?: string
    padding?: {
      top?: string
      bottom?: string
      left?: string
      right?: string
    }
    customCss?: string
  }

  @Column({ default: true })
  isActive!: boolean

  @Column({ default: false })
  isDefault!: boolean // Default template part for the area

  @Column({ type: 'uuid', nullable: true })
  authorId!: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author!: User

  @Column({ default: 0 })
  priority!: number // For ordering multiple parts in same area

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ type: 'json', nullable: true })
  conditions!: {
    pages?: string[] // Specific page IDs
    postTypes?: string[] // post, page, product, etc.
    categories?: string[] // Category IDs
    userRoles?: string[] // Show only to specific user roles
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}